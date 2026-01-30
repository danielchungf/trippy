"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { TripYearCalendar } from "./TripYearCalendar"
import { Trip } from "@/types"

interface CalendarViewProps {
  trips: Trip[]
}

export function CalendarView({ trips }: CalendarViewProps) {
  const [year, setYear] = useState(new Date().getFullYear())

  const prevYear = () => setYear((y) => y - 1)
  const nextYear = () => setYear((y) => y + 1)

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Year navigation header */}
      <div className="flex items-center justify-center px-4 py-3 border-b border-neutral-200">
        <div className="flex items-center gap-1">
          <button
            onClick={prevYear}
            className="p-1.5 hover:bg-neutral-100 rounded-md transition-colors"
            aria-label="Previous year"
          >
            <ChevronLeft className="w-5 h-5 text-neutral-600" />
          </button>
          <span className="text-lg font-semibold min-w-[60px] text-center">
            {year}
          </span>
          <button
            onClick={nextYear}
            className="p-1.5 hover:bg-neutral-100 rounded-md transition-colors"
            aria-label="Next year"
          >
            <ChevronRight className="w-5 h-5 text-neutral-600" />
          </button>
        </div>
      </div>

      {/* Calendar fills remaining space */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <TripYearCalendar trips={trips} year={year} />
      </div>
    </div>
  )
}
