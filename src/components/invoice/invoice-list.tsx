"use client";

import { FileText, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateISO } from "@/lib/dates";
import type { InvoiceSummary } from "@/lib/invoice/types";
import { formatCents } from "@/lib/money";
import { DeleteInvoiceDialog } from "./delete-invoice-dialog";
import { StatusBadge } from "./status-badge";

/** Table on desktop, cards on phones. Rows open the editor; the ⋯ menu offers Open and Delete. */
export function InvoiceList({ invoices }: { invoices: InvoiceSummary[] }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<InvoiceSummary | null>(null);

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-lg border border-dashed border-input/60 bg-card px-6 py-16 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-muted text-brass-ink">
          <FileText aria-hidden="true" className="size-5" />
        </span>
        <h2 className="mt-5 font-display text-3xl leading-none">No invoices yet</h2>
        <p className="mt-3 max-w-sm text-sm text-muted-foreground">
          Create your first invoice. You&apos;ll see it take shape as you type, then print it or send it by email.
        </p>
        <Button asChild size="lg" className="mt-6">
          <Link href="/invoices/new">
            <Plus aria-hidden="true" />
            Create your first invoice
          </Link>
        </Button>
      </div>
    );
  }

  const rowMenu = (invoice: InvoiceSummary) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Actions for invoice ${invoice.number}`} onClick={(e) => e.stopPropagation()}>
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onSelect={() => router.push(`/invoices/${invoice.id}`)}>
          <FileText aria-hidden="true" />
          Open
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(invoice)}>
          <Trash2 aria-hidden="true" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      {/* Desktop */}
      <div className="hidden overflow-hidden rounded-lg border border-border bg-card md:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Your invoices, newest first</caption>
          <thead>
            <tr className="border-b border-foreground/80 text-left">
              {["Number", "Customer", "Issued", "Due"].map((heading) => (
                <th key={heading} scope="col" className="eyebrow px-5 pt-5 pb-3 font-semibold text-muted-foreground">
                  {heading}
                </th>
              ))}
              <th scope="col" className="eyebrow px-5 pt-5 pb-3 text-right font-semibold text-muted-foreground">
                Amount
              </th>
              <th scope="col" className="eyebrow px-5 pt-5 pb-3 font-semibold text-muted-foreground">
                Status
              </th>
              <th scope="col" className="w-14 px-3 pt-5 pb-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr
                key={invoice.id}
                onClick={() => router.push(`/invoices/${invoice.id}`)}
                className="cursor-pointer border-b border-border transition-colors last:border-b-0 hover:bg-accent/50"
              >
                <td className="px-5 py-4">
                  <Link
                    href={`/invoices/${invoice.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded-sm font-medium tabular-nums underline-offset-4 hover:underline"
                  >
                    {invoice.number}
                  </Link>
                </td>
                <td className="max-w-64 truncate px-5 py-4">{invoice.customerName}</td>
                <td className="px-5 py-4 whitespace-nowrap text-muted-foreground tabular-nums">{formatDateISO(invoice.issueDate)}</td>
                <td className="px-5 py-4 whitespace-nowrap text-muted-foreground tabular-nums">{formatDateISO(invoice.dueDate)}</td>
                <td className="px-5 py-4 text-right font-display text-base whitespace-nowrap tabular-nums">{formatCents(invoice.totalCents)}</td>
                <td className="px-5 py-4">
                  <StatusBadge status={invoice.status} />
                </td>
                <td className="px-3 py-4 text-right">{rowMenu(invoice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phones */}
      <ul className="grid gap-3 md:hidden">
        {invoices.map((invoice) => (
          <li key={invoice.id} className="relative rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/invoices/${invoice.id}`} className="rounded-sm font-medium tabular-nums after:absolute after:inset-0">
                  {invoice.number}
                </Link>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">{invoice.customerName}</p>
              </div>
              <div className="relative z-10">{rowMenu(invoice)}</div>
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div className="space-y-1">
                <StatusBadge status={invoice.status} />
                <p className="text-xs text-muted-foreground tabular-nums">Due {formatDateISO(invoice.dueDate)}</p>
              </div>
              <p className="font-display text-xl leading-none tabular-nums">{formatCents(invoice.totalCents)}</p>
            </div>
          </li>
        ))}
      </ul>

      {deleting && (
        <DeleteInvoiceDialog
          invoiceId={deleting.id}
          number={deleting.number}
          open
          onOpenChange={(open) => !open && setDeleting(null)}
          onDeleted={() => router.refresh()}
        />
      )}
    </>
  );
}
