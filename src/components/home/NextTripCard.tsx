"use client"

import Link from "next/link"
import { Shrub, NotepadText, BedDouble, CircleAlert, MapPinned } from "lucide-react"
import { Trip, parseLocalDate, getTripDuration } from "@/types"
import { Button } from "@/components/ui/button"
import placeholderImage from "@/app/landscape-placeholder.jpg"

interface NextTripCardProps {
  trip: Trip
  variant?: 'desktop' | 'mobile'
}

// Get countdown text for upcoming trips
function getCountdownText(trip: Trip): string | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = parseLocalDate(trip.startDate)
  const end = parseLocalDate(trip.endDate)

  if (today > end) return null // Past trip - no badge
  if (today >= start && today <= end) return 'Now' // Ongoing

  const diffDays = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return `In ${diffDays} day${diffDays === 1 ? '' : 's'}`
}

// Format date range with duration for display (e.g., "Mar 25 — Apr 12 (19 days)")
function formatTripDateRangeWithDuration(startDate: string, endDate: string): string {
  const start = parseLocalDate(startDate)
  const end = parseLocalDate(endDate)
  const duration = getTripDuration({ startDate, endDate } as Trip)

  const startMonth = start.toLocaleDateString('en-US', { month: 'short' })
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' })

  const dateRange = startMonth === endMonth
    ? `${startMonth} ${start.getDate()} — ${end.getDate()}`
    : `${startMonth} ${start.getDate()} — ${endMonth} ${end.getDate()}`

  return `${dateRange} (${duration} day${duration === 1 ? '' : 's'})`
}

export function NextTripCard({ trip, variant = 'desktop' }: NextTripCardProps) {
  const countdown = getCountdownText(trip)
  const duration = getTripDuration(trip)

  // Calculate stats from trip data
  const placesCount = trip.savedPlaces?.length || 0
  const activitiesCount = trip.days?.reduce((acc, day) => acc + (day.activities?.length || 0), 0) || 0
  const daysPlanned = trip.days?.filter(day => day.activities && day.activities.length > 0).length || 0
  const staysLogged = trip.accommodations?.length || 0

  // Calculate missing stays (nights without accommodation)
  const tripNights = duration - 1
  let coveredNights = 0
  trip.accommodations?.forEach(acc => {
    const checkIn = parseLocalDate(acc.checkIn)
    const checkOut = parseLocalDate(acc.checkOut)
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
    coveredNights += nights
  })
  const missingStays = Math.max(0, tripNights - coveredNights)

  // Get location names as tags
  const locationTags = trip.locations?.map(loc => loc.name) || []

  if (variant === 'mobile') {
    return (
      <Link href={`/trip/${trip.id}`} className="block">
        <div className="bg-white border-[0.5px] border-[rgba(47,47,47,0.1)] rounded-[15px] overflow-hidden">
          {/* Image */}
          <div className="p-[5px]">
            <div className="relative h-[120px] rounded-[10px] overflow-hidden">
              <img
                src={trip.coverImage || placeholderImage.src}
                alt={trip.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
              {countdown && (
                <div className="absolute top-[10px] left-[10px] bg-white rounded-full px-[10px] py-[5px]">
                  <span className="text-label">
                    {countdown}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="px-[15px] pt-[10px] pb-[15px] flex flex-col gap-[20px]">
            {/* Title and date */}
            <div className="flex flex-col gap-[12px]">
              <div className="flex flex-col gap-[8px]">
                <h3 className="text-h2 truncate">
                  {trip.name}
                </h3>
                <p className="text-body font-medium text-text-secondary">
                  {formatTripDateRangeWithDuration(trip.startDate, trip.endDate)}
                </p>
              </div>

              {/* Location tags */}
              {locationTags.length > 0 && (
                <div className="flex flex-wrap gap-[8px]">
                  {locationTags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-[8px] py-[4px] border border-[rgba(0,0,0,0.1)] rounded-full text-body-sm font-medium text-text-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="h-[1px] bg-surface-border" />

            {/* Stats */}
            <div className="flex flex-col gap-[8px]">
              <div className="flex items-center gap-[8px]">
                <Shrub className="w-[20px] h-[20px] text-text-secondary" />
                <span className="text-body font-medium text-text-secondary">
                  {activitiesCount} activities
                </span>
              </div>
              <div className="flex items-center gap-[8px]">
                <NotepadText className="w-[20px] h-[20px] text-text-secondary" />
                <span className="text-body font-medium text-text-secondary">
                  {daysPlanned}/{duration} days planned
                </span>
              </div>
              <div className="flex items-center gap-[8px]">
                <BedDouble className="w-[20px] h-[20px] text-text-secondary" />
                <span className="text-body font-medium text-text-secondary">
                  {staysLogged} stays logged
                </span>
              </div>
              {missingStays > 0 && (
                <div className="flex items-center gap-[8px]">
                  <CircleAlert className="w-[20px] h-[20px] text-text-secondary" />
                  <span className="text-body font-medium text-text-secondary">
                    {missingStays} night{missingStays === 1 ? '' : 's'} missing stay
                  </span>
                </div>
              )}
            </div>

            {/* Keep planning button */}
            <button className="w-full bg-accent-blue text-white py-[12px] px-[15px] rounded-full text-button text-center hover:bg-accent-blue-hover transition-colors">
              Keep planning
            </button>
          </div>
        </div>
      </Link>
    )
  }

  // Desktop variant - horizontal layout
  return (
    <div className="bg-white border border-neutral-200 rounded-[16px] overflow-hidden flex">
      {/* Image container - 464px width, 4:3 aspect ratio */}
      <div className="p-[4px] shrink-0 relative">
        <img
          src={trip.coverImage || placeholderImage.src}
          alt={trip.name}
          className="w-[464px] aspect-[4/3] object-cover object-center rounded-[12px]"
        />
        {countdown && (
          <div className="absolute top-[10px] left-[10px] bg-white rounded-[10px] px-[10px] py-[4px]">
            <span className="text-label text-neutral-800">
              {countdown}
            </span>
          </div>
        )}
      </div>

      {/* Content - determines the height */}
      <div className="flex-1 min-w-0 pl-[24px] pr-[20px] py-[20px] flex flex-col">
        {/* Title and date */}
        <div className="flex flex-col gap-[8px]">
          <h3 className="text-h1 text-neutral-800 truncate">
            {trip.name}
          </h3>
          <p className="text-h3 text-neutral-600">
            {formatTripDateRangeWithDuration(trip.startDate, trip.endDate)}
          </p>
        </div>

        {/* Location tags */}
        {locationTags.length > 0 && (
          <div className="flex flex-wrap gap-[8px] mt-[20px]">
            {locationTags.map((tag, index) => (
              <span
                key={index}
                className="px-[8px] py-[4px] border border-neutral-200 rounded-full text-body font-medium text-text-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Stats - 24px gap from title/tags */}
        <div className="flex flex-col gap-[8px] mt-[24px]">
          <div className="flex items-center gap-[8px]">
            <MapPinned className="w-[20px] h-[20px] text-blue-400" />
            <span className="text-body text-neutral-600">
              {placesCount} places
            </span>
          </div>
          <div className="flex items-center gap-[8px]">
            <Shrub className="w-[20px] h-[20px] text-blue-400" />
            <span className="text-body text-neutral-600">
              {activitiesCount} activities
            </span>
          </div>
          <div className="flex items-center gap-[8px]">
            <NotepadText className="w-[20px] h-[20px] text-blue-400" />
            <span className="text-body text-neutral-600">
              {daysPlanned}/{duration} days planned
            </span>
          </div>
          <div className="flex items-center gap-[8px]">
            <BedDouble className="w-[20px] h-[20px] text-blue-400" />
            <span className="text-body text-neutral-600">
              {staysLogged} stays logged
            </span>
          </div>
          {missingStays > 0 && (
            <div className="flex items-center gap-[8px]">
              <CircleAlert className="w-[20px] h-[20px] text-orange-400" />
              <span className="text-body text-neutral-600">
                {missingStays} night{missingStays === 1 ? '' : 's'} missing stay
              </span>
            </div>
          )}
        </div>

        {/* Keep planning button - full width, pushed to bottom */}
        <Button
          variant="secondary"
          size="medium"
          className="w-full mt-auto"
          asChild
        >
          <Link href={`/trip/${trip.id}`}>
            Keep planning
          </Link>
        </Button>
      </div>
    </div>
  )
}
