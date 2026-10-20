import { inputToDraft } from "@/lib/invoice/draft";
import type { InvoiceInput, Party } from "@/lib/invoice/schema";
import type { InvoiceDraft, LineItemDraft } from "@/lib/invoice/types";

/** The reference invoice: 2 × $50 − $10 discount + 10% tax = $99.00. */
export const checkInput: InvoiceInput = {
  number: "INV-0042",
  issueDate: "2026-10-20",
  dueDate: "2026-11-19",
  business: {
    name: "Northwind Studio",
    email: "studio@example.com",
    address: "418 Larkspur Lane\nPortland, OR 97205",
  },
  customer: {
    name: "Acme Holdings Ltd.",
    email: "accounts@example.com",
    address: "1 Market Street\nSan Francisco, CA 94105",
  },
  lineItems: [{ id: "l1", description: "Brand strategy workshop", quantity: 2, unitPriceCents: 5000 }],
  discountCents: 1000,
  taxRate: 10,
  customFields: [],
  notes: "",
};

export const checkDraft: InvoiceDraft = inputToDraft(checkInput);

/** The check draft with its only line item patched. */
export function withLine(patch: Partial<LineItemDraft>): InvoiceDraft {
  return { ...checkDraft, lineItems: [{ ...checkDraft.lineItems[0], ...patch }] };
}

/** The check draft with the business or customer details patched. */
export function withParty(party: "business" | "customer", patch: Partial<Party>): InvoiceDraft {
  return { ...checkDraft, [party]: { ...checkDraft[party], ...patch } };
}
