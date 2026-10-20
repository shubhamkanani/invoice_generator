"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

// Toasts double as the app's polite live region (sonner renders aria-live),
// so saved/sent/error messages are announced to screen readers.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-primary" />,
        info: <InfoIcon className="size-4 text-brass-ink" />,
        warning: <TriangleAlertIcon className="size-4 text-brass-ink" />,
        error: <OctagonXIcon className="size-4 text-destructive" />,
        loading: <Loader2Icon className="size-4 animate-spin text-muted-foreground" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius-lg)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "font-sans shadow-pop",
          title: "font-medium",
          description: "text-muted-foreground",
          actionButton: "rounded-full! bg-primary! text-primary-foreground!",
          cancelButton: "rounded-full! bg-secondary! text-secondary-foreground!",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
