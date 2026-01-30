"use client"

import { Trip, generateDaysFromTrip, parseLocalDate } from "@/types"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AIDateSelectorProps {
  trip: Trip
  selectedDates: string[]
  onChange: (dates: string[]) => void
}

export function AIDateSelector({ trip, selectedDates, onChange }: AIDateSelectorProps) {
  const days = generateDaysFromTrip(trip)
  const allDates = days.map(d => d.date)

  const allSelected = selectedDates.length === allDates.length
  const someSelected = selectedDates.length > 0 && !allSelected

  const handleSelectAll = () => {
    onChange(allDates)
  }

  const handleClearAll = () => {
    onChange([])
  }

  const toggleDate = (date: string) => {
    if (selectedDates.includes(date)) {
      onChange(selectedDates.filter(d => d !== date))
    } else {
      onChange([...selectedDates, date].sort())
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Select which days you want AI to plan. Existing activities on these days will be replaced.
      </p>

      <div className="flex gap-2">
        <Button
          variant={allSelected ? "default" : "outline"}
          size="sm"
          onClick={handleSelectAll}
        >
          Plan entire trip
        </Button>
        {someSelected && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
          >
            Clear selection
          </Button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {days.map((day, index) => {
          const date = parseLocalDate(day.date)
          const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' })
          const dayNum = date.getDate()
          const month = date.toLocaleDateString('en-US', { month: 'short' })
          const isSelected = selectedDates.includes(day.date)
          const hasActivities = day.activities.length > 0

          return (
            <button
              key={day.date}
              onClick={() => toggleDate(day.date)}
              className={cn(
                "p-3 rounded-lg border text-left transition-colors",
                isSelected
                  ? "bg-neutral-800 text-white border-neutral-800"
                  : "bg-white hover:bg-neutral-50 border-neutral-200"
              )}
            >
              <div className="text-xs font-medium opacity-70">Day {index + 1}</div>
              <div className="font-semibold">{dayOfWeek} {dayNum}</div>
              <div className="text-xs opacity-70">{month}</div>
              {hasActivities && !isSelected && (
                <div className="text-xs mt-1 text-amber-600">
                  {day.activities.length} activities
                </div>
              )}
            </button>
          )
        })}
      </div>

      {selectedDates.length > 0 && (
        <p className="text-sm text-amber-600">
          {selectedDates.length} day{selectedDates.length !== 1 ? 's' : ''} selected — existing activities will be replaced
        </p>
      )}
    </div>
  )
}
