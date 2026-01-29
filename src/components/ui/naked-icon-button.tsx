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
          "rounded-[10px] transition-colors",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:pointer-events-none disabled:opacity-50",
          selected
            ? "text-neutral-800"
            : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800",
          className
        )}
        ref={ref}
        {...props}
      >
        <span className="w-[20px] h-[20px] flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:stroke-[1.5px]">
          {icon}
        </span>
      </button>
    )
  }
)
NakedIconButton.displayName = "NakedIconButton"

export { NakedIconButton }
