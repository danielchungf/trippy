"use client"

import React, { useMemo } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Trip, parseLocalDate } from "@/types"

// Tailwind 400-level colors to hex mapping
const TAILWIND_TO_HEX: Record<string, string> = {
  'bg-blue-400': '#60a5fa',
  'bg-sky-400': '#38bdf8',
  'bg-cyan-400': '#22d3ee',
  'bg-teal-400': '#2dd4bf',
  'bg-emerald-400': '#34d399',
  'bg-green-400': '#4ade80',
  'bg-lime-400': '#a3e635',
  'bg-yellow-400': '#facc15',
  'bg-amber-400': '#fbbf24',
  'bg-orange-400': '#fb923c',
  'bg-red-400': '#f87171',
  'bg-rose-400': '#fb7185',
  'bg-pink-400': '#f472b6',
  'bg-purple-400': '#c084fc',
}

// Generate a consistent color from trip id (fallback when no color is set)
function getGeneratedTripColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash % 360)
  return `hsl(${hue}, 70%, 65%)`
}

// Get trip color - convert Tailwind class to hex, or generate from ID
function getTripColor(trip: Trip): string {
  if (trip.color && TAILWIND_TO_HEX[trip.color]) {
    return TAILWIND_TO_HEX[trip.color]
  }
  // If it's already a hex color, use it
  if (trip.color && trip.color.startsWith('#')) {
    return trip.color
  }
  return getGeneratedTripColor(trip.id)
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Generate year days with week alignment (Monday-based, Sunday is last)
function generateAlignedYearDays(year: number): Array<{ key: string; date: Date } | null> {
  const jan1 = new Date(year, 0, 1)
  const dec31 = new Date(year, 11, 31)

  // Convert JS day (0=Sunday) to Monday-based (Monday=0, Sunday=6)
  const jan1DayOfWeek = jan1.getDay() // 0=Sunday, 1=Monday, ..., 6=Saturday
  const daysFromMonday = jan1DayOfWeek === 0 ? 6 : jan1DayOfWeek - 1

  // Calculate days after Dec 31 to complete the last week (to Sunday)
  const dec31DayOfWeek = dec31.getDay()
  const daysToSunday = dec31DayOfWeek === 0 ? 0 : 7 - dec31DayOfWeek

  // Generate all days from Monday of Jan 1 week to Sunday of Dec 31 week
  const result: Array<{ key: string; date: Date } | null> = []
  const startDate = new Date(jan1)
  startDate.setDate(startDate.getDate() - daysFromMonday)
  const endDate = new Date(dec31)
  endDate.setDate(endDate.getDate() + daysToSunday)

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const date = new Date(d)
    // If date is before Jan 1 or after Dec 31, use null (empty cell)
    if (date < jan1 || date > dec31) {
      result.push(null)
    } else {
      result.push({ key: formatDateKey(date), date })
    }
  }

  return result
}

const monthShort = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
]

const dayOfWeekShort = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]

interface TripYearCalendarProps {
  trips: Trip[]
  year: number
}

export function TripYearCalendar({ trips, year }: TripYearCalendarProps) {
  const todayKey = formatDateKey(new Date())
  const days = useMemo(() => generateAlignedYearDays(year), [year])

  const dayIndexByKey = useMemo(() => {
    const map = new Map<string, number>()
    days.forEach((d, i) => {
      if (d !== null) {
        map.set(d.key, i)
      }
    })
    return map
  }, [days])

  const gridRef = React.useRef<HTMLDivElement | null>(null)
  const [cellSizePx, setCellSizePx] = React.useState<{ w: number; h: number }>({
    w: 0,
    h: 0,
  })
  const [gridDims, setGridDims] = React.useState<{ cols: number; cell: number }>({
    cols: 14,
    cell: 70,
  })
  const [isMobile, setIsMobile] = React.useState<boolean>(false)

  // Calculate actual cell width for month name visibility check
  const cellWidth = React.useMemo(() => {
    if (cellSizePx.w > 0) return cellSizePx.w
    return gridDims.cell
  }, [cellSizePx.w, gridDims.cell])

  React.useEffect(() => {
    function onResize() {
      const gap = 1
      const minCellSize = 70
      const usableWidth = window.innerWidth - 51 // Account for sidebar (49px + 2px border)
      const usableHeight = window.innerHeight - 60 // Account for header
      const mobileBreakpoint = 768
      const mobile = usableWidth < mobileBreakpoint
      setIsMobile(mobile)

      // Always use week-aligned columns (multiples of 7)
      // Calculate maximum weeks that can fit with minimum cell size
      const maxCols = Math.floor((usableWidth + gap) / (minCellSize + gap))
      const maxWeeks = Math.floor(maxCols / 7)

      // Ensure at least 1 week, and cap at 4 weeks maximum
      const weeks = Math.max(1, Math.min(maxWeeks, 4))
      const cols = weeks * 7

      // Calculate cell size based on the number of weeks
      const widthBasedCell = Math.max(
        minCellSize,
        Math.floor((usableWidth - (cols - 1) * gap) / cols)
      )
      const rows = Math.ceil(days.length / cols)
      const heightBasedCell = rows > 0
        ? Math.max(minCellSize, Math.floor((usableHeight - (rows - 1) * gap) / rows))
        : minCellSize

      // On desktop, use the smaller to ensure square cells; on mobile, allow flexibility
      const cellSize = mobile ? widthBasedCell : Math.min(widthBasedCell, heightBasedCell)
      setGridDims({ cols, cell: cellSize })
    }
    onResize()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [days.length])

  React.useLayoutEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    const firstCell = grid.querySelector<HTMLElement>('[data-day-cell="1"]')
    if (firstCell) {
      const rect = firstCell.getBoundingClientRect()
      if (rect.width && rect.height) {
        setCellSizePx({ w: rect.width, h: rect.height })
      }
    }
  }, [gridDims.cols, gridDims.cell, year])

  // Calculate trip bars that span across days
  const tripBars = useMemo(() => {
    const cols = gridDims.cols || 14
    const gap = 1
    if (!cols || !cellSizePx.w || !cellSizePx.h) return null

    type Seg = {
      row: number
      startCol: number
      endCol: number
      trip: Trip
    }
    const rowToSegs = new Map<number, Seg[]>()
    const yearStartKey = formatDateKey(new Date(year, 0, 1))
    const yearEndKey = formatDateKey(new Date(year, 11, 31))
    const totalDays = days.length

    for (const trip of trips) {
      // Clamp trip dates to year boundaries
      const clampedStartDate = trip.startDate < yearStartKey ? yearStartKey : trip.startDate
      const tripEndDate = trip.endDate
      const clampedEndDate = tripEndDate > yearEndKey ? null : tripEndDate

      // Check if trip overlaps with this year
      if (clampedStartDate > yearEndKey) continue
      if (clampedEndDate !== null && clampedEndDate < yearStartKey) continue

      const startIdx = dayIndexByKey.get(clampedStartDate)
      if (startIdx == null) continue

      // For end index: trip endDate is inclusive, so we add 1 for exclusive end
      let endIdxExclusive: number | null
      if (clampedEndDate === null) {
        // Find the last non-null day index
        endIdxExclusive = totalDays
      } else {
        const endIdx = dayIndexByKey.get(clampedEndDate)
        endIdxExclusive = endIdx != null ? endIdx + 1 : null
      }
      if (endIdxExclusive == null) continue

      // Break trip into row segments
      let segStart = startIdx
      while (segStart < endIdxExclusive) {
        const row = Math.floor(segStart / cols)
        const rowEndExclusive = Math.min(endIdxExclusive, (row + 1) * cols)
        const startCol = segStart % cols
        const endCol = rowEndExclusive % cols === 0 ? cols : rowEndExclusive % cols
        const list = rowToSegs.get(row) ?? []
        list.push({ row, startCol, endCol, trip })
        rowToSegs.set(row, list)
        segStart = rowEndExclusive
      }
    }

    const bars: Array<React.ReactElement> = []
    const labelOffset = 20
    const laneHeight = 16
    const maxLanes = Math.max(1, Math.floor((cellSizePx.h - labelOffset - 2) / laneHeight))

    for (const [row, segs] of rowToSegs) {
      segs.sort((a, b) => a.startCol - b.startCol)
      const laneEnds: number[] = []

      for (const seg of segs) {
        let lane = 0
        while (lane < laneEnds.length && seg.startCol < laneEnds[lane]) {
          lane++
        }
        if (lane >= maxLanes) continue
        if (lane === laneEnds.length) laneEnds.push(seg.endCol)
        else laneEnds[lane] = seg.endCol

        const left = seg.startCol * (cellSizePx.w + gap)
        const top = row * (cellSizePx.h + gap) + labelOffset + lane * laneHeight
        const span = seg.endCol - seg.startCol
        const width = span * cellSizePx.w + (span - 1) * gap
        const key = `${seg.trip.id}:${row}:${seg.startCol}-${seg.endCol}:${lane}`
        const bg = getTripColor(seg.trip)

        bars.push(
          <Link
            key={key}
            href={`/trip/${seg.trip.id}`}
            style={{
              position: "absolute",
              left,
              top,
              width,
              height: laneHeight - 2,
            }}
            className="px-1 pointer-events-auto cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div
              className="truncate rounded-sm px-1 text-[10px] leading-[14px] shadow-sm text-white"
              style={{
                backgroundColor: bg,
                height: laneHeight - 2,
                lineHeight: `${laneHeight - 4}px`,
              }}
            >
              {seg.trip.name}
            </div>
          </Link>
        )
      }
    }
    return bars
  }, [trips, dayIndexByKey, gridDims.cols, cellSizePx, year, days.length])

  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden">
      <div className="relative min-h-full w-full">
        <div
          ref={gridRef}
          className="grid min-h-full w-full bg-neutral-200 p-px"
          suppressHydrationWarning
          style={{
            gridTemplateColumns: `repeat(${gridDims.cols}, 1fr)`,
            gridAutoRows: isMobile ? `${gridDims.cell}px` : "auto",
            gap: "1px",
          }}
        >
          {days.map((day, index) => {
            // Empty placeholder cell for days outside the year
            if (day === null) {
              return (
                <div
                  key={`empty-${index}`}
                  data-day-cell="1"
                  className={cn(
                    "relative bg-neutral-100 p-1 min-w-0 min-h-0 overflow-hidden",
                    !isMobile && "aspect-square"
                  )}
                />
              )
            }

            const { key, date } = day
            const isToday = key === todayKey
            const isFirstOfMonth = date.getDate() === 1
            const isWeekend = date.getDay() === 0 || date.getDay() === 6

            return (
              <div
                key={key}
                data-day-cell="1"
                className={cn(
                  "relative bg-white p-1 min-w-0 min-h-0 overflow-hidden",
                  !isMobile && "aspect-square",
                  isWeekend && "bg-neutral-50",
                  isToday && "ring-2 ring-inset ring-neutral-900"
                )}
                title={date.toDateString()}
              >
                {isFirstOfMonth && cellWidth > 50 && (
                  <div className="absolute top-0 left-0 bg-neutral-900 text-white text-[10px] leading-none uppercase tracking-wide px-1.5 py-0.5">
                    {monthShort[date.getMonth()]}
                  </div>
                )}
                <div
                  className={cn(
                    "absolute top-0.5 text-[10px] leading-none text-neutral-400",
                    cellWidth > 50 ? "right-1 text-right" : "left-1 text-left",
                    isToday && "text-neutral-900 font-semibold"
                  )}
                >
                  <span className="opacity-60 mr-0.5">
                    {dayOfWeekShort[date.getDay()]}
                  </span>
                  {date.getDate()}
                </div>
              </div>
            )
          })}
        </div>
        {/* Trip bars overlay */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ padding: 1 }}
        >
          {tripBars}
        </div>
      </div>
    </div>
  )
}
