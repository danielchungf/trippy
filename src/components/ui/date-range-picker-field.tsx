"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { DateRange } from "react-day-picker"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

interface DateRangePickerFieldProps {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
  numberOfMonths?: number
  placeholder?: string
  className?: string
  disabled?: (date: Date) => boolean
  defaultMonth?: Date
}

export function DateRangePickerField({
  value,
  onChange,
  numberOfMonths = 1,
  placeholder = "Select dates",
  className,
  disabled,
  defaultMonth,
}: DateRangePickerFieldProps) {
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
          {value?.from && value?.to ? (
            <span className="text-text-primary">
              {value.from.toLocaleDateString()} - {value.to.toLocaleDateString()}
            </span>
          ) : (
            <span className="text-text-secondary">{placeholder}</span>
          )}
          <ChevronDown className="h-4 w-4 text-text-secondary" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          defaultMonth={value?.from ?? defaultMonth}
          selected={value}
          onSelect={(range) => {
            onChange(range)
            if (range?.from && range?.to && range.from.getTime() !== range.to.getTime()) {
              setIsOpen(false)
            }
          }}
          numberOfMonths={numberOfMonths}
          disabled={disabled}
        />
      </PopoverContent>
    </Popover>
  )
}
