import { Wordmark } from "@/components/brand/wordmark";

/** Split screen: a forest brand panel with a sample invoice beside the form (form only on phones). */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-primary px-14 py-12 text-primary-foreground lg:flex lg:flex-col">
        <Wordmark tone="paper" />
        <div className="mt-auto max-w-lg">
          <p className="eyebrow text-brass-soft">Invoicing for small studios</p>
          <h2 className="mt-5 font-display text-5xl leading-[1.05] text-balance">
            Invoices, <span className="text-brass-soft">beautifully</span> kept.
          </h2>
          <p className="mt-5 max-w-sm text-base leading-relaxed text-primary-foreground/80">
            Draft, preview and send invoices that add up to the cent, every time.
          </p>
        </div>
        <SampleInvoice />
        <p className="mt-auto pt-10 text-xs text-primary-foreground/60">Totals rounded line by line, then taxed. No surprises.</p>
      </aside>

      <main className="flex flex-col px-4 py-8 sm:px-10">
        <div className="lg:hidden">
          <Wordmark />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
      </main>
    </div>
  );
}

/** Decorative only: a miniature of the invoice sheet the app produces. */
function SampleInvoice() {
  return (
    <div
      aria-hidden="true"
      className="mt-12 w-[22rem] rotate-[-2deg] rounded-sm bg-sheet p-6 text-foreground shadow-[0_30px_60px_-30px_rgb(0_0_0/0.6)]"
    >
      <div className="flex items-baseline justify-between">
        <span className="font-display text-xl">Northwind Studio</span>
        <span className="eyebrow text-brass-ink">Invoice</span>
      </div>
      <div className="mt-4 flex justify-between border-t border-foreground pt-3 text-xs tabular-nums">
        <span>Brand strategy workshop · 2 × $50.00</span>
        <span>$100.00</span>
      </div>
      <div className="mt-2 space-y-1 text-xs tabular-nums text-muted-foreground">
        <div className="flex justify-between">
          <span>Discount</span>
          <span>−$10.00</span>
        </div>
        <div className="flex justify-between">
          <span>Tax (10%)</span>
          <span>$9.00</span>
        </div>
      </div>
      <div className="-mx-6 -mb-6 mt-4 flex items-baseline justify-between bg-primary px-6 py-3 text-primary-foreground">
        <span className="eyebrow text-brass-soft">Amount due</span>
        <span className="font-display text-2xl tabular-nums">$99.00</span>
      </div>
    </div>
  );
}
