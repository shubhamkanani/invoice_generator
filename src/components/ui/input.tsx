import * as React from "react"
import { cn } from "cn"

// Boxed field with a 3:1 edge (--input), small radius and a forest focus ring.
// 16px text on mobile keeps iOS from zooming on focus.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-md border border-input bg-card px-3 py-2 text-base text-foreground transition-[color,border-color,box-shadow] outline-hidden file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground hover:border-foreground/50 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/25 aria-invalid:focus-visible:ring-destructive md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
