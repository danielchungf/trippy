import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-2 rounded-[10px] border px-2 py-1",
  {
    variants: {
      variant: {
        default: "border-neutral-200 bg-transparent",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-neutral-200 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  /** Tailwind bg class for the dot indicator (only shown when provided) */
  dotColor?: string
}

function Badge({ className, variant, dotColor, children, ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    >
      {dotColor && (
        <span
          className={cn("w-3 h-3 shrink-0 rounded-full", dotColor)}
        />
      )}
      <span className="text-h3 text-text-primary">{children}</span>
    </div>
  )
}

export { Badge, badgeVariants }
