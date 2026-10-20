import { cn } from "cn"

// Hairline tone (not --muted) so placeholders stay visible on paper and on panels.
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-border", className)}
      {...props}
    />
  )
}

export { Skeleton }
