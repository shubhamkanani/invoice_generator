import type { InvoiceInput } from "./schema";

export type InvoiceStatus = "draft" | "sent";

/** Totals the server calculated and stored with the invoice (integer cents). */
export interface StoredTotals {
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
}

/** A saved invoice as the services and API return it (JSON-safe). */
export type InvoiceRecord = InvoiceInput & {
  id: string;
  status: InvoiceStatus;
  sentAt: string | null;
  totals: StoredTotals;
  createdAt: string;
  updatedAt: string;
};

/** One row of the invoice list. */
export interface InvoiceSummary {
  id: string;
  number: string;
  customerName: string;
  issueDate: string;
  dueDate: string;
  totalCents: number;
  status: InvoiceStatus;
}

/**
 * Editor state. Numbers stay as the raw strings the person typed ("50.", "1,250")
 * so the inputs never fight the keyboard; `validateDraft` converts them.
 */
export interface LineItemDraft {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

export type InvoiceDraft = Omit<InvoiceInput, "lineItems" | "discountCents" | "taxRate"> & {
  lineItems: LineItemDraft[];
  discount: string;
  taxRate: string;
};

/** Error messages keyed by draft field path, e.g. "lineItems.0.unitPrice" or "customer.email". */
export type FieldErrors = Record<string, string>;
