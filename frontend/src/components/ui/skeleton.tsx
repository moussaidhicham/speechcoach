import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        /*
          rounded-xl instead of rounded-md — consistent with the card/input
          radius used across the system.

          bg-border/40 instead of bg-muted — on the warm paper background,
          bg-muted can read as slightly warm-grey and muddy. bg-border/40
          is a neutral cool tint that reads clearly as a placeholder without
          adding colour noise.

          animate-pulse kept — it's the right pattern. Duration slowed via
          Tailwind's default (2s) which is already calm; no change needed.
        */
        "animate-pulse rounded-xl bg-border/40",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }