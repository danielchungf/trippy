import * as React from "react"
import { cn } from "@/lib/utils"

export type TextFieldProps = React.InputHTMLAttributes<HTMLInputElement>

const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-lg border border-border-muted p-3 font-inter",
          "text-[14px] leading-[18px] tracking-[-0.02em] text-text-primary",
          "placeholder:text-[14px] placeholder:leading-[18px] placeholder:tracking-[-0.02em] placeholder:text-text-secondary",
          "hover:border-border-regular",
          "focus:border-border-regular focus:outline-none",
          "transition-colors",
          className
        )}
        {...props}
      />
    )
  }
)
TextField.displayName = "TextField"

export { TextField }
