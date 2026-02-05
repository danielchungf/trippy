import { cn } from "@/lib/utils"

interface FormFieldProps {
  label: string
  optional?: boolean
  children: React.ReactNode
  className?: string
}

export function FormField({ label, optional, children, className }: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label className="text-h2 font-fustat text-text-primary">
        {label}
        {optional && <span className="text-text-secondary font-normal"> (optional)</span>}
      </label>
      {children}
    </div>
  )
}
