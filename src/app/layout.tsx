import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

// One family for everything: UI text, headings and amounts (see `font-display` in globals.css).
const geist = Geist({
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  variable: "--font-geist",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Remit",
    template: "%s · Remit",
  },
  description: "Create, preview and send clear, accurate invoices in minutes.",
};

export const viewport: Viewport = {
  themeColor: "#F4F1EA",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: browser extensions (ColorZilla, Grammarly, Dark
    // Reader...) add attributes to <html>/<body> before React loads. It only
    // silences attribute differences on these two elements, not their children.
    <html
      lang="en"
      className={cn(geist.variable, "antialiased")}
      suppressHydrationWarning
    >
      <body className="min-h-dvh" suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
