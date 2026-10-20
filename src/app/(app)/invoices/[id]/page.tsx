import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvoiceEditor } from "@/components/invoice/invoice-editor";
import { requireUser } from "@/lib/auth/current-user";
import { inputToDraft } from "@/lib/invoice/draft";
import { getInvoice } from "@/lib/invoices/service";

export const metadata: Metadata = { title: "Invoice" };

export default async function InvoicePage({ params }: PageProps<"/invoices/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const invoice = await getInvoice(user.id, id);
  if (!invoice) notFound();

  return (
    <InvoiceEditor
      key={invoice.id}
      initialDraft={inputToDraft(invoice)}
      invoiceId={invoice.id}
      initialStatus={invoice.status}
      initialSavedAt={invoice.updatedAt}
    />
  );
}
