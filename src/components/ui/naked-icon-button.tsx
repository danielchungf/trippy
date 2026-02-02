import * as React from "react"
import { cn } from "@/lib/utils"

export interface NakedIconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode
  selected?: boolean
}

const NakedIconButton = React.forwardRef<HTMLButtonElement, NakedIconButtonProps>(
  ({ className, icon, selected = false, ...props }, ref) => {
    return (
      <button
        className={cn(
          "w-[28px] h-[28px] inline-flex items-center justify-center",
          "rounded-[8px] transition-colors",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:pointer-events-none disabled:opacity-50",
          selected
            ? "text-text-primary"
            : "text-text-secondary hover:bg-neutral-100 hover:text-text-primary",
          className
        )}
        ref={ref}
        {...props}
      >
        <span className="w-[20px] h-[20px] flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:stroke-[1.8]">
          {icon}
        </span>
      </button>
    )
  }
)
NakedIconButton.displayName = "NakedIconButton"

export { NakedIconButton }
