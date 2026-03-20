"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        /*
          text-sm kept — labels should match input text size.
          font-medium → font-normal: labels don't need to be bold,
          the input below them carries the visual weight. Medium weight
          is reserved for values, not descriptors.
          text-muted-foreground: labels are secondary to the field value.
          leading-snug instead of leading-none — better for multi-word
          labels that might wrap on narrow layouts.
          gap-1.5 instead of gap-2 — slightly tighter when paired with
          an icon or required asterisk.
        */
        "flex items-center gap-1.5 text-sm leading-snug font-normal text-muted-foreground select-none",
        "group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Label }