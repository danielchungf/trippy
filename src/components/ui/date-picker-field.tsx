"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

interface DatePickerFieldProps {
  value: Date | undefined
  onChange: (date: Date | undefined) => void
  disabled?: (date: Date) => boolean
  defaultMonth?: Date
  placeholder?: string
  className?: string
}

export function DatePickerField({
  value,
  onChange,
  disabled,
  defaultMonth,
  placeholder = "Select date",
  className,
}: DatePickerFieldProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center justify-between rounded-lg border border-border-muted p-3",
            "text-body transition-colors",
            "hover:border-border-regular",
            isOpen && "border-border-regular",
            className
          )}
        >
          {value ? (
            <span className="text-text-primary">{value.toLocaleDateString()}</span>
          ) : (
            <span className="text-text-secondary">{placeholder}</span>
          )}
          <ChevronDown className="h-4 w-4 text-text-secondary" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            onChange(date)
            setIsOpen(false)
          }}
          disabled={disabled}
          defaultMonth={defaultMonth ?? value}
        />
      </PopoverContent>
    </Popover>
  )
}
