"use client"

import React, { useMemo, useRef } from "react"
import { cn } from "@/lib/utils"
import { Trip, Location, parseLocalDate, LOCATION_COLORS } from "@/types"

// Tailwind 400-level colors to hex mapping (shared with TripYearCalendar)
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

function getLocationColor(location: Location): string {
  const color = location.color || LOCATION_COLORS[0].value
  if (TAILWIND_TO_HEX[color]) return TAILWIND_TO_HEX[color]
  if (color.startsWith('#')) return color
  return '#60a5fa'
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const BAR_HEIGHT = 22
const BAR_GAP = 2
const TOP_OFFSET = 32 // space for day number + 8px gap
const COLS = 7
const GRID_GAP = 1

interface DestinationCalendarProps {
  trip: Trip
  onEditLocation: (location: Location) => void
}

type Seg = {
  row: number
  startCol: number
  endCol: number
  lane: number
  location: Location
}

export function DestinationCalendar({ trip, onEditLocation }: DestinationCalendarProps) {
  const gridRef = useRef<HTMLDivElement | null>(null)
  const [cellWidth, setCellWidth] = React.useState(0)

  // Generate Monday-aligned date grid spanning the trip
  const { days, tripStartKey, tripEndKey } = useMemo(() => {
    const tripStart = parseLocalDate(trip.startDate)
    const tripEnd = parseLocalDate(trip.endDate)
    const tripStartKey = formatDateKey(tripStart)
    const tripEndKey = formatDateKey(tripEnd)

    // Find Monday on or before tripStart
    const startDow = tripStart.getDay()
    const daysFromMonday = startDow === 0 ? 6 : startDow - 1
    const gridStart = new Date(tripStart)
    gridStart.setDate(gridStart.getDate() - daysFromMonday)

    // Find Sunday on or after tripEnd
    const endDow = tripEnd.getDay()
    const daysToSunday = endDow === 0 ? 0 : 7 - endDow
    const gridEnd = new Date(tripEnd)
    gridEnd.setDate(gridEnd.getDate() + daysToSunday)

    const result: Array<{ key: string; date: Date; inRange: boolean }> = []
    for (let d = new Date(gridStart); d <= gridEnd; d.setDate(d.getDate() + 1)) {
      const date = new Date(d)
      const key = formatDateKey(date)
      const inRange = key >= tripStartKey && key <= tripEndKey
      result.push({ key, date, inRange })
    }

    return { days: result, tripStartKey, tripEndKey }
  }, [trip.startDate, trip.endDate])

  const dayIndexByKey = useMemo(() => {
    const map = new Map<string, number>()
    days.forEach((d, i) => map.set(d.key, i))
    return map
  }, [days])

  const sortedLocations = useMemo(() =>
    [...trip.locations].sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [trip.locations]
  )

  const totalRows = Math.ceil(days.length / COLS)

  // Compute segments and lane assignments (no cap — all destinations shown)
  const { segments, lanesPerRow } = useMemo(() => {
    const rowToSegs = new Map<number, Array<{ startCol: number; endCol: number; location: Location }>>()

    for (const location of sortedLocations) {
      const startIdx = dayIndexByKey.get(location.startDate)
      const endIdx = dayIndexByKey.get(location.endDate)
      if (startIdx == null || endIdx == null) continue

      const endIdxExclusive = endIdx + 1

      let segStart = startIdx
      while (segStart < endIdxExclusive) {
        const row = Math.floor(segStart / COLS)
        const rowEndExclusive = Math.min(endIdxExclusive, (row + 1) * COLS)
        const startCol = segStart % COLS
        const endCol = rowEndExclusive % COLS === 0 ? COLS : rowEndExclusive % COLS
        const list = rowToSegs.get(row) ?? []
        list.push({ startCol, endCol, location })
        rowToSegs.set(row, list)
        segStart = rowEndExclusive
      }
    }

    // Assign lanes and compute max lanes per row
    const lanesPerRow = new Map<number, number>()
    const allSegments: Seg[] = []

    for (let row = 0; row < totalRows; row++) {
      const segs = rowToSegs.get(row) ?? []
      segs.sort((a, b) => a.startCol - b.startCol)
      const laneEnds: number[] = []

      for (const seg of segs) {
        let lane = 0
        while (lane < laneEnds.length && seg.startCol < laneEnds[lane]) {
          lane++
        }
        if (lane === laneEnds.length) laneEnds.push(seg.endCol)
        else laneEnds[lane] = seg.endCol

        allSegments.push({ row, startCol: seg.startCol, endCol: seg.endCol, lane, location: seg.location })
      }

      lanesPerRow.set(row, laneEnds.length)
    }

    return { segments: allSegments, lanesPerRow }
  }, [sortedLocations, dayIndexByKey, totalRows])

  // Compute row heights based on lanes needed
  // If any row has multiple lanes, all rows use the tallest row's height
  const rowHeights = useMemo(() => {
    let maxHeight = 0
    for (let row = 0; row < totalRows; row++) {
      const lanes = lanesPerRow.get(row) ?? 0
      const barsHeight = lanes > 0 ? lanes * (BAR_HEIGHT + BAR_GAP) : (BAR_HEIGHT + BAR_GAP)
      maxHeight = Math.max(maxHeight, TOP_OFFSET + barsHeight)
    }
    return Array(totalRows).fill(maxHeight) as number[]
  }, [totalRows, lanesPerRow])

  // Cumulative row top positions (for absolute positioning of bars)
  const rowTops = useMemo(() => {
    const tops: number[] = []
    let cumulative = 0
    for (let row = 0; row < totalRows; row++) {
      tops.push(cumulative)
      cumulative += rowHeights[row] + GRID_GAP
    }
    return tops
  }, [rowHeights, totalRows])

  // Measure cell width
  React.useLayoutEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    const firstCell = grid.querySelector<HTMLElement>('[data-cal-cell]')
    if (firstCell) {
      const rect = firstCell.getBoundingClientRect()
      if (rect.width) setCellWidth(rect.width)
    }
  }, [days.length])

  React.useEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    const observer = new ResizeObserver(() => {
      const firstCell = grid.querySelector<HTMLElement>('[data-cal-cell]')
      if (firstCell) {
        const rect = firstCell.getBoundingClientRect()
        if (rect.width) setCellWidth(rect.width)
      }
    })
    observer.observe(grid)
    return () => observer.disconnect()
  }, [days.length])

  // Render bar elements
  const barElements = useMemo(() => {
    if (!cellWidth) return null

    return segments.map((seg) => {
      const left = seg.startCol * (cellWidth + GRID_GAP)
      const top = rowTops[seg.row] + TOP_OFFSET + seg.lane * (BAR_HEIGHT + BAR_GAP)
      const span = seg.endCol - seg.startCol
      const width = span * cellWidth + (span - 1) * GRID_GAP
      const bg = getLocationColor(seg.location)
      const key = `${seg.location.id}:${seg.row}:${seg.startCol}`

      return (
        <button
          key={key}
          onClick={() => onEditLocation(seg.location)}
          style={{
            position: "absolute",
            left,
            top,
            width,
            height: BAR_HEIGHT,
            backgroundColor: bg,
          }}
          className="px-2 text-white text-[11px] font-medium leading-[22px] truncate text-left cursor-pointer hover:opacity-80 transition-opacity pointer-events-auto shadow-sm"
        >
          {seg.location.name}
        </button>
      )
    })
  }, [segments, cellWidth, rowTops, onEditLocation])

  const monthShort = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]

  // Build gridTemplateRows from computed heights
  const gridTemplateRows = rowHeights.map(h => `${h}px`).join(' ')

  return (
    <div className="relative pt-2">
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 gap-px bg-white border-b border-neutral-200">
        {DAY_LABELS.map(label => (
          <div key={label} className="py-1.5 text-center text-[11px] font-medium text-text-secondary uppercase tracking-wide">
            {label}
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div className="relative">
        <div
          ref={gridRef}
          className="grid grid-cols-7 gap-px bg-neutral-200"
          style={{ gridTemplateRows }}
        >
          {days.map((day, index) => {
            const isFirstOfMonth = day.date.getDate() === 1
            const row = Math.floor(index / COLS)
            const isLastRow = row === totalRows - 1
            return (
              <div
                key={day.key}
                data-cal-cell
                className={cn(
                  "relative px-1.5 pt-1",
                  day.inRange ? "bg-white" : "bg-neutral-50",
                  isLastRow && "border-b border-neutral-200"
                )}
              >
                <span className={cn(
                  "text-[12px] leading-none",
                  day.inRange ? "text-text-primary" : "text-neutral-300"
                )}>
                  {isFirstOfMonth && (
                    <span className="text-text-secondary font-medium mr-0.5">{monthShort[day.date.getMonth()]} </span>
                  )}
                  {day.date.getDate()}
                </span>
              </div>
            )
          })}
        </div>

        {/* Destination bars overlay */}
        <div className="pointer-events-none absolute inset-0">
          {barElements}
        </div>
      </div>
    </div>
  )
}
