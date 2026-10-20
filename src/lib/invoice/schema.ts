import { z } from "zod";
import { isValidISODate } from "@/lib/dates";
import { calculateTotals, formatCents } from "@/lib/money";

/**
 * Domain schemas for an invoice. The same schema validates the editor (via
 * `validateDraft`) and every API write, so the browser and the server can
 * never disagree about what a valid invoice is.
 *
 * Bounds keep every cent value well below Number.MAX_SAFE_INTEGER:
 * 100 lines × 100,000 qty × $1,000,000.00 is 1e15 cents.
 */
export const LIMITS = {
  maxQuantity: 100_000,
  maxUnitPriceCents: 100_000_000, // $1,000,000.00
  maxLineItems: 100,
  maxCustomFields: 20,
} as const;

/** True when `value` has no more than `places` decimal digits (e.g. 1.25 for 2). */
function hasAtMostDecimals(places: number) {
  const factor = 10 ** places;
  return (value: number) => Math.abs(value * factor - Math.round(value * factor)) < 1e-6;
}

const optionalEmail = z
  .string()
  .trim()
  .max(254, "Keep the email under 254 characters")
  .refine((value) => value === "" || z.email().safeParse(value).success, "Enter a valid email address");

function partySchema(nameRequiredMessage: string) {
  return z.object({
    name: z.string().trim().min(1, nameRequiredMessage).max(120, "Keep the name under 120 characters"),
    email: optionalEmail,
    address: z.string().trim().max(500, "Keep the address under 500 characters"),
  });
}

const calendarDate = z.string().refine(isValidISODate, "Enter a valid date");

export const lineItemSchema = z.object({
  id: z.string().min(1).max(64),
  description: z.string().trim().min(1, "Add a description").max(300, "Keep the description under 300 characters"),
  quantity: z
    .number()
    .min(0, "Quantity can't be negative")
    .max(LIMITS.maxQuantity, "Quantity is too large")
    .refine(hasAtMostDecimals(2), "Use at most 2 decimal places"),
  unitPriceCents: z
    .number()
    .int("Use at most 2 decimal places")
    .min(0, "Price can't be negative")
    .max(LIMITS.maxUnitPriceCents, "Price is too large"),
});

export const customFieldSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().trim().min(1, "Add a label").max(40, "Keep the label under 40 characters"),
  value: z.string().trim().min(1, "Add a value").max(200, "Keep the value under 200 characters"),
  visible: z.boolean(),
});

/**
 * Rules that compare fields with each other. Exported so the editor can show
 * them even while other fields are still invalid (zod skips object-level
 * refinements in some of those cases).
 */
export function crossFieldIssues(invoice: {
  issueDate: string;
  dueDate: string;
  lineItems: { quantity: number; unitPriceCents: number }[];
  discountCents: number;
}): { path: string; message: string }[] {
  const issues: { path: string; message: string }[] = [];
  if (isValidISODate(invoice.issueDate) && isValidISODate(invoice.dueDate) && invoice.dueDate < invoice.issueDate) {
    issues.push({ path: "dueDate", message: "Due date must be on or after the issue date" });
  }
  const { subtotalCents } = calculateTotals({ lineItems: invoice.lineItems, discountCents: 0, taxRate: 0 });
  if (invoice.discountCents > subtotalCents) {
    issues.push({
      path: "discountCents",
      message: `Discount can't be more than the subtotal (${formatCents(subtotalCents)})`,
    });
  }
  return issues;
}

export const invoiceInputSchema = z
  .object({
    number: z.string().trim().min(1, "Enter an invoice number").max(32, "Keep the invoice number under 32 characters"),
    issueDate: calendarDate,
    dueDate: calendarDate,
    business: partySchema("Enter your business name"),
    customer: partySchema("Enter the customer's name"),
    lineItems: z
      .array(lineItemSchema)
      .min(1, "Add at least one line item")
      .max(LIMITS.maxLineItems, `Use at most ${LIMITS.maxLineItems} line items`),
    discountCents: z.number().int("Use at most 2 decimal places").min(0, "Discount can't be negative"),
    taxRate: z
      .number()
      .min(0, "Tax rate can't be negative")
      .max(100, "Tax rate can't be more than 100%")
      .refine(hasAtMostDecimals(3), "Use at most 3 decimal places"),
    customFields: z
      .array(customFieldSchema)
      .max(LIMITS.maxCustomFields, `Use at most ${LIMITS.maxCustomFields} custom fields`),
    notes: z.string().trim().max(2000, "Keep notes under 2,000 characters"),
  })
  .superRefine((invoice, ctx) => {
    for (const issue of crossFieldIssues(invoice)) {
      ctx.addIssue({ code: "custom", path: [issue.path], message: issue.message });
    }
  });

export type InvoiceInput = z.infer<typeof invoiceInputSchema>;
export type Party = InvoiceInput["business"];
export type LineItemInput = InvoiceInput["lineItems"][number];
export type CustomField = InvoiceInput["customFields"][number];

/** Body of POST /api/invoices/[id]/send. CR/LF in the subject would allow header injection. */
export const sendInvoiceSchema = z.object({
  to: z.email("Enter a valid email address"),
  subject: z
    .string()
    .trim()
    .min(1, "Add a subject")
    .max(200, "Keep the subject under 200 characters")
    .refine((value) => !/[\r\n]/.test(value), "The subject must be a single line"),
  message: z.string().trim().max(2000, "Keep the message under 2,000 characters"),
});

export type SendInvoiceInput = z.infer<typeof sendInvoiceSchema>;
