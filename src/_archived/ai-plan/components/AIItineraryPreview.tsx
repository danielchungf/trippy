"use client"

import { Loader2, MapPin, Clock, AlertCircle } from "lucide-react"
import { AIPlanResponse } from "@/types/ai"
import { parseLocalDate } from "@/types"

interface AIItineraryPreviewProps {
  plan: AIPlanResponse | null
  isLoading: boolean
  error?: string
}

export function AIItineraryPreview({ plan, isLoading, error }: AIItineraryPreviewProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
        <p className="text-sm text-text-secondary">Generating your itinerary...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <div>
          <p className="font-medium text-red-600">Failed to generate itinerary</p>
          <p className="text-sm text-text-secondary mt-1">{error}</p>
        </div>
      </div>
    )
  }

  if (!plan) {
    return null
  }

  return (
    <div className="space-y-4 max-h-[400px] overflow-y-auto">
      {plan.days.map((day, dayIndex) => {
        const date = parseLocalDate(day.date)
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' })
        const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

        return (
          <div key={day.date} className="border rounded-lg overflow-hidden">
            {/* Day Header */}
            <div className="bg-neutral-100 px-4 py-2 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold">{day.name || `Day ${dayIndex + 1}`}</span>
                  <span className="text-sm text-text-secondary ml-2">
                    {dayOfWeek}, {formattedDate}
                  </span>
                </div>
                <span className="text-xs text-text-secondary">
                  {day.activities.length} activities
                </span>
              </div>
            </div>

            {/* Activities */}
            <div className="divide-y">
              {day.activities.map((activity, actIndex) => (
                <div key={actIndex} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    {/* Time */}
                    <div className="flex-shrink-0 w-12 text-sm font-mono text-text-secondary">
                      {activity.time || '--:--'}
                    </div>

                    {/* Activity Details */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{activity.title}</div>
                      <div className="flex items-center gap-1 text-xs text-text-secondary mt-0.5">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{activity.place.name}</span>
                      </div>
                      {activity.duration && (
                        <div className="flex items-center gap-1 text-xs text-text-secondary mt-0.5">
                          <Clock className="h-3 w-3" />
                          <span>{formatDuration(activity.duration)}</span>
                        </div>
                      )}
                      {activity.notes && (
                        <p className="text-xs text-text-secondary mt-1 italic">
                          {activity.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`
  }
  return `${hours}h ${mins}m`
}
