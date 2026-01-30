import { AIPlanResponse, AIGeneratedDay, AIGeneratedActivity } from '@/types/ai'

// Validate that the AI response has the expected structure
export function validateAIPlanResponse(data: unknown): AIPlanResponse | null {
  if (!data || typeof data !== 'object') {
    return null
  }

  const response = data as Record<string, unknown>

  if (!Array.isArray(response.days)) {
    return null
  }

  const validatedDays: AIGeneratedDay[] = []

  for (const day of response.days) {
    const validatedDay = validateDay(day)
    if (!validatedDay) {
      return null
    }
    validatedDays.push(validatedDay)
  }

  return { days: validatedDays }
}

function validateDay(data: unknown): AIGeneratedDay | null {
  if (!data || typeof data !== 'object') {
    return null
  }

  const day = data as Record<string, unknown>

  // date is required
  if (typeof day.date !== 'string' || !isValidDate(day.date)) {
    return null
  }

  // activities is required and must be an array
  if (!Array.isArray(day.activities)) {
    return null
  }

  const validatedActivities: AIGeneratedActivity[] = []

  for (const activity of day.activities) {
    const validatedActivity = validateActivity(activity)
    if (!validatedActivity) {
      continue // Skip invalid activities but don't fail the whole day
    }
    validatedActivities.push(validatedActivity)
  }

  return {
    date: day.date,
    name: typeof day.name === 'string' ? day.name : undefined,
    activities: validatedActivities,
  }
}

function validateActivity(data: unknown): AIGeneratedActivity | null {
  if (!data || typeof data !== 'object') {
    return null
  }

  const activity = data as Record<string, unknown>

  // title is required
  if (typeof activity.title !== 'string' || !activity.title.trim()) {
    return null
  }

  // place is required with at least name and address
  if (!activity.place || typeof activity.place !== 'object') {
    return null
  }

  const place = activity.place as Record<string, unknown>
  if (typeof place.name !== 'string' || typeof place.address !== 'string') {
    return null
  }

  // Validate coordinates if present
  let coordinates: { lat: number; lng: number } | undefined
  if (place.coordinates && typeof place.coordinates === 'object') {
    const coords = place.coordinates as Record<string, unknown>
    if (typeof coords.lat === 'number' && typeof coords.lng === 'number') {
      coordinates = { lat: coords.lat, lng: coords.lng }
    }
  }

  return {
    title: activity.title.trim(),
    time: typeof activity.time === 'string' ? activity.time : undefined,
    duration: typeof activity.duration === 'number' ? activity.duration : undefined,
    place: {
      name: place.name,
      address: place.address,
      coordinates,
    },
    notes: typeof activity.notes === 'string' ? activity.notes : undefined,
  }
}

function isValidDate(dateStr: string): boolean {
  // Check YYYY-MM-DD format
  const regex = /^\d{4}-\d{2}-\d{2}$/
  if (!regex.test(dateStr)) {
    return false
  }

  const date = new Date(dateStr)
  return !isNaN(date.getTime())
}
