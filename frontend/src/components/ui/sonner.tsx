"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-3.5" />,
        info:    <InfoIcon className="size-3.5" />,
        warning: <TriangleAlertIcon className="size-3.5" />,
        error:   <OctagonXIcon className="size-3.5" />,
        loading: <Loader2Icon className="size-3.5 animate-spin" />,
      }}
      style={
        {
          /*
            Surface: popover background and foreground — same as the
            select dropdown and other floating panels.

            Border: matches the /60 opacity used across the system.

            Radius: use --radius-md (0.875rem) — slightly tighter than
            the card --radius-lg. Toasts are compact; a large radius
            makes them look pill-like.

            Shadow: two-stop layered, consistent with cards and dropdowns.
            Sonner exposes --toast-shadow for this.
          */
          "--normal-bg":     "hsl(var(--popover))",
          "--normal-text":   "hsl(var(--popover-foreground))",
          "--normal-border": "hsl(var(--border) / 0.6)",
          "--border-radius": "var(--radius-md)",
          "--toast-shadow":
            "0 1px 2px hsl(var(--foreground) / 0.04), 0 8px 24px -8px hsl(var(--foreground) / 0.10)",

          /* Success / info / warning / error tones from the CSS palette */
          "--success-bg":   "hsl(172 38% 95%)",
          "--success-text": "hsl(172 38% 22%)",
          "--success-border":"hsl(172 38% 78%)",

          "--info-bg":    "hsl(210 22% 95%)",
          "--info-text":  "hsl(210 22% 22%)",
          "--info-border":"hsl(210 22% 78%)",

          "--warning-bg":    "hsl(30 40% 95%)",
          "--warning-text":  "hsl(30 40% 26%)",
          "--warning-border":"hsl(30 40% 78%)",

          "--error-bg":    "hsl(5 45% 95%)",
          "--error-text":  "hsl(5 45% 28%)",
          "--error-border":"hsl(5 45% 78%)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
          /*
            Keep description visually secondary — muted-foreground weight,
            not the same colour as the title.
          */
          description: "text-muted-foreground",
          actionButton: "bg-primary text-primary-foreground text-xs",
          cancelButton: "bg-secondary text-secondary-foreground text-xs",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }