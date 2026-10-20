import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import { InvoiceEditor } from "@/components/invoice/invoice-editor";
import { requireUser } from "@/lib/auth/current-user";
import { todayISO } from "@/lib/dates";
import { inputToDraft, newLineItemDraft } from "@/lib/invoice/draft";
import { getNewInvoiceDefaults } from "@/lib/invoices/service";

export const metadata: Metadata = { title: "New invoice" };

export default async function NewInvoicePage() {
  const user = await requireUser();
  const defaults = await getNewInvoiceDefaults(user.id, todayISO());
  const draft = { ...inputToDraft(defaults), lineItems: [newLineItemDraft(randomUUID())] };
  return <InvoiceEditor initialDraft={draft} />;
}
