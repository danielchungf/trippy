"use client"

import { type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface SegmentedControlOption<T extends string> {
  value: T
  icon: ReactNode
}

interface SegmentedControlProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: SegmentedControlOption<T>[]
}

export function SegmentedControl<T extends string>({ value, onChange, options }: SegmentedControlProps<T>) {
  return (
    <div className="flex items-center gap-0.5 p-px h-[32px] rounded-[8px] border border-neutral-200 bg-neutral-100">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex items-center justify-center w-7 h-7 rounded-[6px] transition-colors [&>svg]:stroke-[2.25]",
            value === option.value
              ? "bg-white text-text-primary shadow-sm"
              : "bg-transparent text-text-secondary"
          )}
        >
          {option.icon}
        </button>
      ))}
    </div>
  )
}
