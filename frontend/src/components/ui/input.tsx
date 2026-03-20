import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        /*
          Height: h-10 instead of h-12 — matches the button default size (h-9)
          plus a touch extra for text inputs. h-12 was oversized and made forms
          feel heavy.

          Border: border-border/70 instead of border-input/90 — consistent with
          cards and badges across the system.

          Background: bg-background instead of bg-background/90 — full opacity
          reads as a clearly editable surface, not a ghosted one.

          Focus ring: ring-2 instead of ring-3, ring/25 opacity — visible but
          calm. Consistent with the button focus ring.

          Removed the inset shadow — it added visual weight on an already-bordered
          input. The border alone is enough to define the field.
        */
        "h-10 w-full min-w-0 rounded-xl border border-border/70 bg-background px-3.5 py-2 text-sm",
        "text-foreground placeholder:text-muted-foreground/60",
        "transition-colors outline-none",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25",
        "hover:border-border",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted/40 disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20",
        "dark:bg-input/20 dark:border-border/50 dark:hover:border-border/70",
        "dark:disabled:bg-input/60 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/30",
        "file:inline-flex file:h-5 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Input }