"use client"

import { useMemo } from "react"
import Link from "next/link"
import { Trip, parseLocalDate } from "@/types"
import { cn } from "@/lib/utils"

interface BigYearCalendarProps {
  trips: Trip[]
  year?: number
}

interface DayCell {
  date: Date
  dayOfWeek: string
  dayNumber: number
  isFirstOfMonth: boolean
  monthLabel?: string
  trip?: Trip
  isPlaceholder?: boolean
}

// Week starts on Monday, ends on Sunday (columns 7 and 14 are always Sunday)
const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

// Convert JS day (0=Sun) to Monday-based index (0=Mon, 6=Sun)
function getMondayBasedDayIndex(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1
}
const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

// Generate a consistent color from trip id (fallback when no color is set)
function getGeneratedTripColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash % 360)
  return `hsl(${hue}, 70%, 85%)`
}

// Get trip color - use assigned color if available, otherwise generate one
function getTripColor(trip: Trip): string {
  return trip.color || getGeneratedTripColor(trip.id)
}

export function BigYearCalendar({ trips, year }: BigYearCalendarProps) {
  const currentYear = year ?? new Date().getFullYear()

  // Generate all days of the year with week alignment
  const days = useMemo(() => {
    const result: DayCell[] = []
    const jan1 = new Date(currentYear, 0, 1)
    const endDate = new Date(currentYear, 11, 31)

    // Add placeholder days before Jan 1 to align with week structure
    // Week runs Mon-Sun, so Sunday should be on columns 7 and 14
    const jan1JsDay = jan1.getDay() // 0 = Sunday, 1 = Monday, etc.
    const jan1MondayIndex = getMondayBasedDayIndex(jan1JsDay) // 0 = Mon, 6 = Sun

    // Add placeholder days to pad before Jan 1
    // If Jan 1 is Thursday (index 3 in Mon-based), we need 3 placeholders (Mon, Tue, Wed)
    for (let i = 0; i < jan1MondayIndex; i++) {
      const daysBack = jan1MondayIndex - i
      const placeholderDate = new Date(currentYear, 0, 1 - daysBack)
      result.push({
        date: placeholderDate,
        dayOfWeek: DAY_NAMES[placeholderDate.getDay()],
        dayNumber: placeholderDate.getDate(),
        isFirstOfMonth: false,
        isPlaceholder: true
      })
    }

    // Add all days of the year
    const current = new Date(jan1)
    while (current <= endDate) {
      const dayOfWeek = DAY_NAMES[current.getDay()]
      const dayNumber = current.getDate()
      const isFirstOfMonth = dayNumber === 1
      const monthLabel = isFirstOfMonth ? MONTH_NAMES[current.getMonth()] : undefined

      // Find if any trip covers this day
      const trip = trips.find(t => {
        const tripStart = parseLocalDate(t.startDate)
        const tripEnd = parseLocalDate(t.endDate)
        return current >= tripStart && current <= tripEnd
      })

      result.push({
        date: new Date(current),
        dayOfWeek,
        dayNumber,
        isFirstOfMonth,
        monthLabel,
        trip
      })

      current.setDate(current.getDate() + 1)
    }

    return result
  }, [currentYear, trips])

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="grid grid-cols-7 xl:grid-cols-14">
        {days.map((day, index) => (
          <DayCellComponent key={index} day={day} />
        ))}
      </div>
    </div>
  )
}

function DayCellComponent({ day }: { day: DayCell }) {
  // Placeholder cells (days before Jan 1)
  if (day.isPlaceholder) {
    return (
      <div className="border-l border-t border-[#d4d4d4] bg-[#d4d4d4] aspect-square" />
    )
  }

  const tripColor = day.trip ? getTripColor(day.trip) : undefined

  const content = (
    <div
      className={cn(
        "border-l border-t border-[#d4d4d4] relative flex items-start justify-between",
        "aspect-square"
      )}
      style={{ backgroundColor: tripColor }}
    >
      {/* Month badge - left aligned */}
      {day.isFirstOfMonth && day.monthLabel ? (
        <span className="bg-[#0a0a0a] text-white text-[10px] font-medium px-[4px] py-[1px]">
          {day.monthLabel}
        </span>
      ) : (
        <span />
      )}
      {/* Day label - right aligned */}
      <div className="flex gap-[2px] items-center px-[4px] py-[1px]">
        <span className="text-[10px] font-medium text-[#a1a1a1] tracking-[-0.2px]">
          {day.dayOfWeek}
        </span>
        <span className="text-[10px] font-medium text-[#525252] tracking-[-0.2px]">
          {day.dayNumber}
        </span>
      </div>
    </div>
  )

  if (day.trip) {
    return (
      <Link href={`/trip/${day.trip.id}`} className="hover:opacity-80 transition-opacity">
        {content}
      </Link>
    )
  }

  return content
}
