import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 px-6 py-16">
      <Wordmark href="/invoices" />
      <p className="eyebrow text-brass-ink">Not found</p>
      <h1 className="font-display text-5xl leading-none">This page isn&apos;t in the ledger.</h1>
      <p className="text-muted-foreground">
        The invoice may have been deleted, or the link belongs to another account.
      </p>
      <div>
        <Button asChild size="lg">
          <Link href="/invoices">Back to invoices</Link>
        </Button>
      </div>
    </main>
  );
}
