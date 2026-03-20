import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  /*
    Base: slightly taller than the original h-5, generous horizontal padding,
    softer radius (rounded-lg instead of rounded-4xl pill). Font weight dropped
    to font-medium — badges are labels, not calls to action.
  */
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-lg border border-transparent px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        /*
          default: primary-tinted — used for the most prominent status labels.
          Softened to bg-primary/12 so it doesn't compete with primary buttons.
        */
        default:
          "bg-primary/12 text-primary border-primary/20 [a]:hover:bg-primary/18",

        /*
          secondary: warm sand surface — the workhorse badge for neutral labels.
        */
        secondary:
          "bg-secondary text-secondary-foreground border-border/60 [a]:hover:bg-secondary/70",

        /*
          destructive: soft red tint, never harsh.
        */
        destructive:
          "bg-destructive/10 text-destructive border-destructive/20 focus-visible:ring-destructive/20 dark:bg-destructive/15 dark:focus-visible:ring-destructive/30 [a]:hover:bg-destructive/15",

        /*
          outline: bordered, transparent fill — for lower-emphasis labels
          sitting on already-coloured surfaces.
        */
        outline:
          "border-border/70 text-muted-foreground [a]:hover:bg-muted [a]:hover:text-foreground",

        /*
          ghost: no border, no fill until hovered. Inline contextual labels.
        */
        ghost:
          "text-muted-foreground hover:bg-secondary hover:text-foreground dark:hover:bg-muted/40",

        /*
          link: plain text link style.
        */
        link:
          "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      { className: cn(badgeVariants({ variant }), className) },
      props
    ),
    render,
    state: { slot: "badge", variant },
  })
}

export { Badge, badgeVariants }