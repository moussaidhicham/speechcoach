"use client"

import * as React from "react"
import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area"

import { cn } from "@/lib/utils"

function ScrollArea({
  className,
  children,
  ...props
}: ScrollAreaPrimitive.Root.Props) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className={cn(
          "size-full rounded-[inherit] outline-none transition-[color,box-shadow]",
          "focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
        )}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: ScrollAreaPrimitive.Scrollbar.Props) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        /*
          Narrowed from 2.5 (10px) to 2 (8px) — scrollbars should be
          unobtrusive. The transparent border padding stays to keep the
          thumb away from the viewport edge.

          Removed the visible border on track edges (border-t, border-l) —
          those created a hard line that competed with card borders on
          contained scroll areas. The thumb alone is enough to signal
          the scroll region.
        */
        "flex touch-none p-px transition-colors select-none",
        "data-vertical:h-full data-vertical:w-2",
        "data-horizontal:h-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className={cn(
          /*
            bg-border/60 instead of bg-border — matches the /60 opacity
            used on borders throughout the system. Full bg-border can look
            too dark and heavy against light card surfaces.
          */
          "relative flex-1 rounded-full bg-border/60 transition-colors",
          "hover:bg-border"
        )}
      />
    </ScrollAreaPrimitive.Scrollbar>
  )
}

export { ScrollArea, ScrollBar }