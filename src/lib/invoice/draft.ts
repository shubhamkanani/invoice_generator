import { centsToInput, calculateTotals, parseDecimal, type DecimalParse, type Totals } from "@/lib/money";
import { crossFieldIssues, invoiceInputSchema, type CustomField, type InvoiceInput } from "./schema";
import type { FieldErrors, InvoiceDraft, LineItemDraft } from "./types";

/** A fresh line: quantity 1 and a blank price (never "0.00", so typing a price doesn't append to zeros). */
export function newLineItemDraft(id: string): LineItemDraft {
  return { id, description: "", quantity: "1", unitPrice: "" };
}

export function newCustomField(id: string): CustomField {
  return { id, label: "", value: "", visible: true };
}

/** Stored invoice → editable strings. A zero discount or tax rate becomes blank (blank means zero). */
export function inputToDraft(input: InvoiceInput): InvoiceDraft {
  return {
    number: input.number,
    issueDate: input.issueDate,
    dueDate: input.dueDate,
    business: { ...input.business },
    customer: { ...input.customer },
    lineItems: input.lineItems.map((line) => ({
      id: line.id,
      description: line.description,
      quantity: String(line.quantity),
      unitPrice: centsToInput(line.unitPriceCents),
    })),
    discount: input.discountCents === 0 ? "" : centsToInput(input.discountCents),
    taxRate: input.taxRate === 0 ? "" : String(input.taxRate),
    customFields: input.customFields.map((field) => ({ ...field })),
    notes: input.notes,
  };
}

function numberMessage(parse: Exclude<DecimalParse, { ok: true }>, label: string, places: number): string {
  switch (parse.reason) {
    case "empty":
      return `Enter a ${label.toLowerCase()}`;
    case "negative":
      return `${label} can't be negative`;
    case "precision":
      return `Use at most ${places} decimal places`;
    case "invalid":
      return "Enter a number";
  }
}

/**
 * Parses every numeric string in the draft. Anything unparsable becomes 0 so the
 * live preview can always render; the reasons are returned as field errors.
 */
function parseDraftNumbers(draft: InvoiceDraft): { input: InvoiceInput; errors: FieldErrors } {
  const errors: FieldErrors = {};

  const lineItems = draft.lineItems.map((line, index) => {
    const quantity = parseDecimal(line.quantity, 2);
    const price = parseDecimal(line.unitPrice, 2);
    if (!quantity.ok) errors[`lineItems.${index}.quantity`] = numberMessage(quantity, "Quantity", 2);
    if (!price.ok) errors[`lineItems.${index}.unitPrice`] = numberMessage(price, "Price", 2);
    return {
      id: line.id,
      description: line.description,
      quantity: quantity.ok ? quantity.scaled / 100 : 0,
      unitPriceCents: price.ok ? price.scaled : 0,
    };
  });

  // Discount and tax are optional: blank means zero.
  const discount = parseDecimal(draft.discount, 2);
  if (!discount.ok && discount.reason !== "empty") errors.discount = numberMessage(discount, "Discount", 2);
  const taxRate = parseDecimal(draft.taxRate, 3);
  if (!taxRate.ok && taxRate.reason !== "empty") errors.taxRate = numberMessage(taxRate, "Tax rate", 3);

  return {
    input: {
      ...draft,
      lineItems,
      discountCents: discount.ok ? discount.scaled : 0,
      taxRate: taxRate.ok ? taxRate.scaled / 1000 : 0,
    },
    errors,
  };
}

/** Server field paths use stored names; the form uses the draft names. */
export function toDraftPath(serverPath: string): string {
  return serverPath
    .split(".")
    .map((segment) => (segment === "unitPriceCents" ? "unitPrice" : segment === "discountCents" ? "discount" : segment))
    .join(".");
}

/** DOM id for the input that edits `path`, so errors can focus it. */
export function fieldId(path: string): string {
  return `f-${path.replaceAll(".", "-")}`;
}

/**
 * Full validation for Save/Send. Number-format problems come first, then the
 * shared domain schema, then the cross-field rules (always reported, even when
 * other fields are invalid). The first message per field wins.
 */
export function validateDraft(draft: InvoiceDraft): { input: InvoiceInput | null; errors: FieldErrors } {
  const { input, errors } = parseDraftNumbers(draft);
  const add = (path: string, message: string) => {
    if (!(path in errors)) errors[path] = message;
  };

  const result = invoiceInputSchema.safeParse(input);
  if (!result.success) {
    for (const issue of result.error.issues) add(toDraftPath(issue.path.join(".")), issue.message);
  }
  for (const issue of crossFieldIssues(input)) add(toDraftPath(issue.path), issue.message);

  const valid = result.success && Object.keys(errors).length === 0;
  return { input: valid ? result.data : null, errors };
}

/** Lenient conversion for the live preview: never throws, unparsable numbers count as zero. */
export function previewFromDraft(draft: InvoiceDraft): { invoice: InvoiceInput; totals: Totals } {
  const { input } = parseDraftNumbers(draft);
  return { invoice: input, totals: calculateTotals(input) };
}
