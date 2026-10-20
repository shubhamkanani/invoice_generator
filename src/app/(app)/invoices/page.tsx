import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { InvoiceList } from "@/components/invoice/invoice-list";
import { RefreshOnMount } from "@/components/refresh-on-mount";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/current-user";
import type { InvoiceSummary } from "@/lib/invoice/types";
import { listInvoices } from "@/lib/invoices/service";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Invoices" };

const total = (rows: InvoiceSummary[]) => rows.reduce((sum, row) => sum + row.totalCents, 0);
const plural = (count: number) => `${count} invoice${count === 1 ? "" : "s"}`;

export default async function InvoicesPage() {
  const user = await requireUser();
  const invoices = await listInvoices(user.id);
  const sent = invoices.filter((invoice) => invoice.status === "sent");
  const drafts = invoices.filter((invoice) => invoice.status === "draft");

  return (
    <div className="mx-auto max-w-[90rem] px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <RefreshOnMount />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-brass-ink">{user.name}</p>
          <h1 className="mt-3 font-display text-4xl leading-none sm:text-5xl">Invoices</h1>
        </div>
        <Button asChild size="lg">
          <Link href="/invoices/new">
            <Plus aria-hidden="true" />
            New invoice
          </Link>
        </Button>
      </div>

      {invoices.length > 0 && (
        <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:max-w-3xl">
          <Stat label="Sent" amount={formatCents(total(sent))} detail={plural(sent.length)} tone="forest" />
          <Stat label="In draft" amount={formatCents(total(drafts))} detail={plural(drafts.length)} />
        </dl>
      )}

      <div className="mt-8">
        <InvoiceList invoices={invoices} />
      </div>
    </div>
  );
}

function Stat({ label, amount, detail, tone }: { label: string; amount: string; detail: string; tone?: "forest" }) {
  return (
    <div
      className={cn(
        "rounded-lg border px-5 py-4",
        tone === "forest" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card",
      )}
    >
      <dt className={cn("eyebrow", tone === "forest" ? "text-brass-soft" : "text-brass-ink")}>{label}</dt>
      <dd className="mt-2 flex items-baseline justify-between gap-4">
        <span className="font-display text-3xl leading-none tabular-nums">{amount}</span>
        <span className={cn("text-xs", tone === "forest" ? "text-primary-foreground/80" : "text-muted-foreground")}>{detail}</span>
      </dd>
    </div>
  );
}
