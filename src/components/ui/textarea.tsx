import * as React from "react"
import { cn } from "cn"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full rounded-md border border-input bg-card px-3 py-2.5 text-base leading-relaxed text-foreground transition-[color,border-color,box-shadow] outline-hidden placeholder:text-muted-foreground hover:border-foreground/50 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/25 aria-invalid:focus-visible:ring-destructive md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
