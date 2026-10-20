import { formatDateISO } from "@/lib/dates";
import type { InvoiceInput, Party } from "@/lib/invoice/schema";
import { formatCents, formatQuantity, formatRate, type Totals } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * The invoice document itself: used for the live preview and for printing.
 * Hidden custom fields are never rendered here, so they can't be printed.
 * It is a container-query root, so narrow phones get a stacked line layout.
 */
export function InvoiceSheet({ invoice, totals, className }: { invoice: InvoiceInput; totals: Totals; className?: string }) {
  const visibleFields = invoice.customFields.filter((field) => field.visible && (field.label.trim() || field.value.trim()));
  const due = formatDateISO(invoice.dueDate);
  const notes = invoice.notes.trim();

  return (
    <article
      aria-label={`Invoice ${invoice.number || "preview"}`}
      className={cn("invoice-sheet @container overflow-hidden rounded-sm bg-sheet text-foreground shadow-sheet", className)}
    >
      <div className="px-6 pt-8 @md:px-10 @md:pt-10">
        <header className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="font-display text-2xl leading-tight break-words @md:text-3xl">
              {invoice.business.name.trim() || <Placeholder>Your business</Placeholder>}
            </p>
            <PartyDetails party={invoice.business} />
          </div>
          <div className="shrink-0 text-right">
            <p className="eyebrow text-brass-ink">Invoice</p>
            <p className="mt-2 text-sm tabular-nums">{invoice.number.trim() || "—"}</p>
          </div>
        </header>

        <div className="mt-8 grid gap-6 @md:grid-cols-[minmax(0,1fr)_auto] @md:gap-10">
          <div className="min-w-0">
            <p className="eyebrow text-brass-ink">Billed to</p>
            <p className="mt-2 text-sm font-semibold break-words">
              {invoice.customer.name.trim() || <Placeholder>Customer name</Placeholder>}
            </p>
            <PartyDetails party={invoice.customer} />
          </div>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] content-start gap-x-6 gap-y-1.5 text-xs @md:min-w-52">
            <DetailRow label="Issued" value={formatDateISO(invoice.issueDate) || "—"} />
            <DetailRow label="Due" value={due || "—"} />
            {visibleFields.map((field) => (
              <DetailRow key={field.id} label={field.label} value={field.value} />
            ))}
          </dl>
        </div>

        <table className="mt-8 w-full table-fixed border-collapse text-sm">
          <thead>
            <tr className="border-b border-foreground">
              <th scope="col" className="eyebrow pb-2.5 text-left text-muted-foreground">
                Description
              </th>
              <th scope="col" className="eyebrow hidden w-14 pb-2.5 text-right text-muted-foreground @md:table-cell">
                Qty
              </th>
              <th scope="col" className="eyebrow hidden w-28 pb-2.5 text-right text-muted-foreground @md:table-cell">
                Unit price
              </th>
              <th scope="col" className="eyebrow w-28 pb-2.5 text-right text-muted-foreground">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((line, index) => (
              <tr key={line.id} className="break-inside-avoid border-b border-border align-top">
                <td className="py-3 pr-4 break-words">
                  {line.description.trim() || <Placeholder>Untitled item</Placeholder>}
                  <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums @md:hidden">
                    {formatQuantity(line.quantity)} × {formatCents(line.unitPriceCents)}
                  </span>
                </td>
                <td className="hidden py-3 text-right tabular-nums @md:table-cell">{formatQuantity(line.quantity)}</td>
                <td className="hidden py-3 text-right tabular-nums @md:table-cell">{formatCents(line.unitPriceCents)}</td>
                <td className="py-3 text-right tabular-nums">{formatCents(totals.lineTotalsCents[index] ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {invoice.lineItems.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No line items yet</p>}

        <dl className="mt-5 ml-auto w-full max-w-64 space-y-1.5 text-sm tabular-nums">
          <TotalRow label="Subtotal" value={formatCents(totals.subtotalCents)} />
          {totals.discountCents > 0 && <TotalRow label="Discount" value={`−${formatCents(totals.discountCents)}`} />}
          {invoice.taxRate > 0 && <TotalRow label={`Tax (${formatRate(invoice.taxRate)})`} value={formatCents(totals.taxCents)} />}
        </dl>
      </div>

      <div className="mt-8 flex items-end justify-between gap-4 bg-primary px-6 py-5 text-primary-foreground @md:px-10">
        <div>
          <p className="eyebrow text-brass-soft">Amount due</p>
          {due && <p className="mt-2 text-xs text-primary-foreground/85">Due {due}</p>}
        </div>
        <p className="font-display text-3xl leading-none tabular-nums @md:text-4xl">{formatCents(totals.totalCents)}</p>
      </div>

      {notes ? (
        <div className="px-6 py-7 @md:px-10">
          <p className="eyebrow text-brass-ink">Notes</p>
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap break-words">{notes}</p>
        </div>
      ) : (
        <div className="h-6" />
      )}
    </article>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return <span className="text-muted-foreground italic">{children}</span>;
}

function PartyDetails({ party }: { party: Party }) {
  const lines = [party.email.trim(), party.address.trim()].filter(Boolean);
  if (lines.length === 0) return null;
  return (
    <p className="mt-1.5 text-xs leading-relaxed whitespace-pre-line break-words text-muted-foreground">{lines.join("\n")}</p>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground break-words">{label}</dt>
      <dd className="text-right tabular-nums break-words">{value}</dd>
    </>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
