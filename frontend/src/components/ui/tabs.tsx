"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn("group/tabs flex gap-2 data-horizontal:flex-col", className)}
      {...props}
    />
  )
}

/* ─── List variants ──────────────────────────────────────────────────── */

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center text-muted-foreground group-data-horizontal/tabs:h-9 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col",
  {
    variants: {
      variant: {
        /*
          default: pill-container style.
          bg-border/30 instead of bg-muted — same reasoning as skeletons
          and progress tracks: warmer muted looks muddy on the paper background.
          rounded-xl consistent with the rest of the system.
          Slightly more padding (p-1 instead of p-[3px]) for breathing room.
        */
        default: "rounded-xl bg-border/30 p-1",

        /*
          line: underline indicator style, no background.
          gap-1 between triggers, border-b on the list for the track line.
        */
        line: "gap-1 rounded-none border-b border-border/60 bg-transparent data-[variant=line]:rounded-none",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

/* ─── Trigger ────────────────────────────────────────────────────────── */

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        /*
          Base: text-sm, font-medium, calm inactive colour.
          Height fills the list minus padding for default variant: h-[calc(100%-0.5rem)]
          since the list uses p-1 (0.25rem each side). Line variant uses h-full.
          focus-visible:ring-2 consistent with all other focusable elements.
        */
        "relative inline-flex h-[calc(100%-0.5rem)] flex-1 items-center justify-center gap-1.5 rounded-lg border border-transparent px-3 py-1 text-sm font-medium whitespace-nowrap",
        "group-data-[variant=line]/tabs-list:h-full",
        "text-muted-foreground transition-all duration-200 ease-out",
        "group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start",
        "hover:text-foreground hover:bg-secondary/40",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none",
        "disabled:pointer-events-none disabled:opacity-40",
        "aria-disabled:pointer-events-none aria-disabled:opacity-40",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",

        /* default variant active state */
        "group-data-[variant=default]/tabs-list:data-active:bg-background",
        "group-data-[variant=default]/tabs-list:data-active:text-foreground",
        "group-data-[variant=default]/tabs-list:data-active:shadow-sm",
        "group-data-[variant=default]/tabs-list:data-active:border-border/60",
        "dark:group-data-[variant=default]/tabs-list:data-active:bg-input/30",
        "dark:group-data-[variant=default]/tabs-list:data-active:border-input",

        /* line variant: subtle background for active state */
        "group-data-[variant=line]/tabs-list:rounded-none",
        "group-data-[variant=line]/tabs-list:bg-transparent",
        "group-data-[variant=line]/tabs-list:data-active:bg-primary/5",
        "group-data-[variant=line]/tabs-list:data-active:text-foreground",
        "group-data-[variant=line]/tabs-list:data-active:font-semibold",

        /*
          Underline indicator - primary colour with glow effect.
          Positioned just below the list border-b so it sits on top of the track.
          Thicker underline with shadow for better visibility.
        */
        "after:absolute after:opacity-0 after:transition-all after:duration-300 after:ease-out after:rounded-full",
        "after:bg-primary after:shadow-[0_0_12px_rgba(var(--primary),0.5)]",
        "group-data-horizontal/tabs:after:inset-x-2 group-data-horizontal/tabs:after:bottom-[-1px] group-data-horizontal/tabs:after:h-[2px]",
        "group-data-vertical/tabs:after:inset-y-2 group-data-vertical/tabs:after:-right-px group-data-vertical/tabs:after:w-[2px]",
        "group-data-[variant=line]/tabs-list:data-active:after:opacity-100",

        className
      )}
      {...props}
    />
  )
}

/* ─── Content panel ──────────────────────────────────────────────────── */

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }