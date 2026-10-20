import Link from "next/link";
import { cn } from "@/lib/utils";

/** The Remit mark: forest tile with the brass rule, plus the name. */
export function Wordmark({ href, tone = "ink", className }: { href?: string; tone?: "ink" | "paper"; className?: string }) {
  const content = (
    <>
      <svg viewBox="0 0 32 32" aria-hidden="true" className="size-7 shrink-0">
        <rect width="32" height="32" rx="7" fill={tone === "paper" ? "#F4F1EA" : "#1F3D2F"} />
        <path
          d="M11 23V8.5h5.2a4.3 4.3 0 0 1 0 8.6H11m5.2 0L21.5 23"
          fill="none"
          stroke={tone === "paper" ? "#1F3D2F" : "#F4F1EA"}
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <rect x="11" y="25.5" width="10.5" height="1.5" rx=".75" fill="#A9844A" />
      </svg>
      <span className="font-display text-xl leading-none">Remit</span>
    </>
  );
  const classes = cn(
    "inline-flex items-center gap-2.5 rounded-sm",
    tone === "paper" ? "text-primary-foreground" : "text-foreground",
    className,
  );
  return href ? (
    <Link href={href} className={classes} aria-label="Remit home">
      {content}
    </Link>
  ) : (
    <span className={classes}>{content}</span>
  );
}
