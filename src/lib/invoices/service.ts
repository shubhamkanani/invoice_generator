import { addDaysISO } from "@/lib/dates";
import { connectToDatabase } from "@/lib/db/connect";
import { InvoiceModel, isDuplicateKeyError, isObjectIdString, type InvoiceDoc } from "@/lib/db/models";
import { nextInvoiceNumber } from "@/lib/invoice/numbering";
import { invoiceInputSchema, type InvoiceInput } from "@/lib/invoice/schema";
import type { InvoiceRecord, InvoiceSummary, StoredTotals } from "@/lib/invoice/types";
import { calculateTotals } from "@/lib/money";

/*
 * Invoice data access. Every function takes the owner's userId explicitly and
 * scopes its query by it, so one account can never read or change another's
 * invoices. Writes validate with the shared schema and store totals computed
 * here — totals sent by a client are never trusted.
 */

export class DuplicateInvoiceNumberError extends Error {
  constructor(readonly number: string) {
    super(`${number} is already used by another invoice`);
    this.name = "DuplicateInvoiceNumberError";
  }
}

function storedTotals(input: InvoiceInput): StoredTotals {
  const { subtotalCents, discountCents, taxCents, totalCents } = calculateTotals(input);
  return { subtotalCents, discountCents, taxCents, totalCents };
}

/** Plain, JSON-safe copy of a stored invoice (no Mongo types leak to the UI). */
function toRecord(doc: InvoiceDoc): InvoiceRecord {
  const party = (p: InvoiceDoc["business"]) => ({ name: p.name ?? "", email: p.email ?? "", address: p.address ?? "" });
  return {
    id: doc._id.toString(),
    number: doc.number,
    status: doc.status,
    sentAt: doc.sentAt ? doc.sentAt.toISOString() : null,
    issueDate: doc.issueDate,
    dueDate: doc.dueDate,
    business: party(doc.business),
    customer: party(doc.customer),
    lineItems: doc.lineItems.map(({ id, description, quantity, unitPriceCents }) => ({
      id,
      description,
      quantity,
      unitPriceCents,
    })),
    discountCents: doc.discountCents,
    taxRate: doc.taxRate,
    customFields: doc.customFields.map(({ id, label, value, visible }) => ({ id, label, value, visible })),
    notes: doc.notes ?? "",
    totals: {
      subtotalCents: doc.totals.subtotalCents,
      discountCents: doc.totals.discountCents,
      taxCents: doc.totals.taxCents,
      totalCents: doc.totals.totalCents,
    },
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function listInvoices(userId: string): Promise<InvoiceSummary[]> {
  await connectToDatabase();
  const docs = await InvoiceModel.find({ userId })
    .sort({ createdAt: -1, _id: -1 })
    .select({ number: 1, "customer.name": 1, issueDate: 1, dueDate: 1, "totals.totalCents": 1, status: 1 })
    .lean<Pick<InvoiceDoc, "_id" | "number" | "customer" | "issueDate" | "dueDate" | "totals" | "status">[]>();
  return docs.map((doc) => ({
    id: doc._id.toString(),
    number: doc.number,
    customerName: doc.customer?.name ?? "",
    issueDate: doc.issueDate,
    dueDate: doc.dueDate,
    totalCents: doc.totals.totalCents,
    status: doc.status,
  }));
}

/** The invoice, or null when it doesn't exist, belongs to someone else, or the id is malformed. */
export async function getInvoice(userId: string, id: string): Promise<InvoiceRecord | null> {
  if (!isObjectIdString(id)) return null;
  await connectToDatabase();
  const doc = await InvoiceModel.findOne({ _id: id, userId }).lean<InvoiceDoc>();
  return doc ? toRecord(doc) : null;
}

/** Throws ZodError for invalid input and DuplicateInvoiceNumberError for a number already in use. */
export async function createInvoice(userId: string, rawInput: unknown): Promise<InvoiceRecord> {
  const input = invoiceInputSchema.parse(rawInput);
  await connectToDatabase();
  try {
    const doc = await InvoiceModel.create({ ...input, userId, status: "draft", sentAt: null, totals: storedTotals(input) });
    return toRecord(doc.toObject());
  } catch (error) {
    if (isDuplicateKeyError(error)) throw new DuplicateInvoiceNumberError(input.number);
    throw error;
  }
}

/** Replaces the editable content; status and sentAt are kept (editing a sent invoice leaves it sent). */
export async function updateInvoice(userId: string, id: string, rawInput: unknown): Promise<InvoiceRecord | null> {
  const input = invoiceInputSchema.parse(rawInput);
  if (!isObjectIdString(id)) return null;
  await connectToDatabase();
  try {
    const doc = await InvoiceModel.findOneAndUpdate(
      { _id: id, userId },
      { $set: { ...input, totals: storedTotals(input) } },
      { returnDocument: "after", runValidators: true },
    ).lean<InvoiceDoc>();
    return doc ? toRecord(doc) : null;
  } catch (error) {
    if (isDuplicateKeyError(error)) throw new DuplicateInvoiceNumberError(input.number);
    throw error;
  }
}

export async function deleteInvoice(userId: string, id: string): Promise<boolean> {
  if (!isObjectIdString(id)) return false;
  await connectToDatabase();
  const { deletedCount } = await InvoiceModel.deleteOne({ _id: id, userId });
  return deletedCount === 1;
}

export async function markInvoiceSent(userId: string, id: string): Promise<InvoiceRecord | null> {
  if (!isObjectIdString(id)) return null;
  await connectToDatabase();
  const doc = await InvoiceModel.findOneAndUpdate(
    { _id: id, userId },
    { $set: { status: "sent", sentAt: new Date() } },
    { returnDocument: "after" },
  ).lean<InvoiceDoc>();
  return doc ? toRecord(doc) : null;
}

/** Starting values for a new invoice: next number, today + 30 days, and the last invoice's business details. */
export async function getNewInvoiceDefaults(userId: string, today: string): Promise<InvoiceInput> {
  await connectToDatabase();
  const [numbers, latest] = await Promise.all([
    InvoiceModel.find({ userId }).select({ number: 1 }).lean<Pick<InvoiceDoc, "number">[]>(),
    InvoiceModel.findOne({ userId })
      .sort({ createdAt: -1, _id: -1 })
      .select({ business: 1 })
      .lean<Pick<InvoiceDoc, "business">>(),
  ]);
  const blankParty = { name: "", email: "", address: "" };
  return {
    number: nextInvoiceNumber(numbers.map((doc) => doc.number)),
    issueDate: today,
    dueDate: addDaysISO(today, 30),
    business: latest
      ? { name: latest.business.name ?? "", email: latest.business.email ?? "", address: latest.business.address ?? "" }
      : blankParty,
    customer: blankParty,
    lineItems: [],
    discountCents: 0,
    taxRate: 0,
    customFields: [],
    notes: "",
  };
}
