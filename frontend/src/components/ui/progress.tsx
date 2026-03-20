"use client"

import { Progress as ProgressPrimitive } from "@base-ui/react/progress"

import { cn } from "@/lib/utils"

function Progress({
  className,
  children,
  value,
  trackClassName,
  indicatorClassName,
  ...props
}: ProgressPrimitive.Root.Props & {
  trackClassName?: string
  indicatorClassName?: string
}) {
  return (
    <ProgressPrimitive.Root
      value={value}
      data-slot="progress"
      className={cn("w-full", className)}
      {...props}
    >
      {children}
      <ProgressTrack className={trackClassName}>
        <ProgressIndicator className={indicatorClassName} />
      </ProgressTrack>
    </ProgressPrimitive.Root>
  )
}

function ProgressTrack({ className, ...props }: ProgressPrimitive.Track.Props) {
  return (
    <ProgressPrimitive.Track
      data-slot="progress-track"
      className={cn(
        /*
          h-1.5 instead of h-1 — 4px is too thin to read comfortably,
          especially at partial values. 6px is still understated.
          bg-border/40 instead of bg-muted — on warm backgrounds,
          muted can read as slightly yellow-grey. A border-tinted track
          is neutral and pairs better with the primary fill.
        */
        "relative flex h-1.5 w-full items-center overflow-hidden rounded-full bg-border/40",
        className
      )}
      {...props}
    />
  )
}

function ProgressIndicator({
  className,
  ...props
}: ProgressPrimitive.Indicator.Props) {
  return (
    <ProgressPrimitive.Indicator
      data-slot="progress-indicator"
      className={cn(
        /*
          Slightly rounded right cap when not at 100% would be ideal but
          isn't achievable without JS. transition-[width] scoped instead
          of transition-all to avoid layout repaints.
        */
        "h-full rounded-full bg-primary transition-[width] duration-300 ease-out",
        className
      )}
      {...props}
    />
  )
}

function ProgressLabel({ className, ...props }: ProgressPrimitive.Label.Props) {
  return (
    <ProgressPrimitive.Label
      data-slot="progress-label"
      className={cn(
        "text-sm font-normal text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function ProgressValue({ className, ...props }: ProgressPrimitive.Value.Props) {
  return (
    <ProgressPrimitive.Value
      data-slot="progress-value"
      className={cn(
        "ml-auto font-mono text-sm text-muted-foreground tabular-nums",
        className
      )}
      {...props}
    />
  )
}

export {
  Progress,
  ProgressTrack,
  ProgressIndicator,
  ProgressLabel,
  ProgressValue,
}
