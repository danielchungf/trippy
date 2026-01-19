// Place categories
export type PlaceCategory = 'food' | 'see' | 'do' | 'stay' | 'shop' | 'nightlife'

// Coordinates
export interface Coordinates {
  lat: number
  lng: number
}

// Place info (used in Activity and SavedPlace)
export interface PlaceInfo {
  name: string
  address: string
  coordinates: Coordinates
  googlePlaceId?: string
}

// Saved Place (trip-level, saved during planning)
export interface SavedPlace {
  id: string
  name: string
  googlePlaceId?: string
  address: string
  coordinates: Coordinates
  category: PlaceCategory | string
  notes?: string
  photos?: string[]
  locationId?: string
}

// Activity (core entity - lives inside a Day)
export interface Activity {
  id: string
  title: string
  time?: string
  duration?: number // minutes
  savedPlaceId?: string
  place: PlaceInfo
  notes?: string
}

// Day (derived from trip dates)
export interface Day {
  date: string // ISO date
  locationId?: string
  activities: Activity[]
}

// Accommodation type
export type AccommodationType = 'hotel' | 'airbnb' | 'hostel' | 'family' | 'friend' | 'other'

// Accommodation (trip-level, spans days)
export interface Accommodation {
  id: string
  name: string
  type: AccommodationType
  address: string
  coordinates?: Coordinates
  googlePlaceId?: string
  checkIn: string // ISO date
  checkOut: string // ISO date
  checkInTime?: string
  checkOutTime?: string
  notes?: string
  cost?: number
  contact?: string
  bookingUrl?: string
  locationId?: string
}

// Location (lightweight grouping for organizing days)
export interface Location {
  id: string
  name: string // city/area (e.g., "Barcelona", "Rome")
  coordinates?: Coordinates // center point for biasing place searches
  googlePlaceId?: string
  startDate: string // ISO date
  endDate: string // ISO date
}

// Trip (top-level container)
export interface Trip {
  id: string
  name: string
  startDate: string // ISO date
  endDate: string // ISO date
  coverImage?: string
  locations: Location[]
  accommodations: Accommodation[]
  savedPlaces: SavedPlace[]
  days: Day[]
}

// Trip status (derived)
export type TripStatus = 'upcoming' | 'ongoing' | 'past'

// Parse ISO date string (YYYY-MM-DD) as local date, not UTC
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// Format Date to ISO date string (YYYY-MM-DD) using local date
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Helper function to determine trip status
export function getTripStatus(trip: Trip): TripStatus {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = parseLocalDate(trip.startDate)
  const end = parseLocalDate(trip.endDate)

  if (today < start) return 'upcoming'
  if (today > end) return 'past'
  return 'ongoing'
}

// Helper to generate days from trip dates
export function generateDaysFromTrip(trip: Trip): Day[] {
  const days: Day[] = []
  const start = parseLocalDate(trip.startDate)
  const end = parseLocalDate(trip.endDate)

  const current = new Date(start)
  while (current <= end) {
    const dateStr = formatLocalDate(current)

    // Find which location this day belongs to
    const location = trip.locations.find(loc => {
      const locStart = parseLocalDate(loc.startDate)
      const locEnd = parseLocalDate(loc.endDate)
      return current >= locStart && current <= locEnd
    })

    // Check if day already exists in trip
    const existingDay = trip.days.find(d => d.date === dateStr)

    days.push({
      date: dateStr,
      locationId: location?.id,
      activities: existingDay?.activities || []
    })

    current.setDate(current.getDate() + 1)
  }

  return days
}

// Format date for display
export function formatDate(dateStr: string): string {
  const date = parseLocalDate(dateStr)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

// Format date range
export function formatDateRange(startDate: string, endDate: string): string {
  const start = parseLocalDate(startDate)
  const end = parseLocalDate(endDate)

  const startMonth = start.toLocaleDateString('en-US', { month: 'short' })
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' })

  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()} - ${end.getDate()}`
  }

  return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}`
}

// Calculate trip duration in days
export function getTripDuration(trip: Trip): number {
  const start = parseLocalDate(trip.startDate)
  const end = parseLocalDate(trip.endDate)
  const diff = end.getTime() - start.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1
}
