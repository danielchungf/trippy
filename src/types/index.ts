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
  name?: string // Custom name (e.g., "Beach Day", "Museum Tour")
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

// Location colors for calendar view - organized by intensity (500, 400, 300)
export const LOCATION_COLORS = [
  // Row 1: Medium intensity (500)
  { name: 'Blue', value: '#3b82f6', row: 0 },       // blue-500
  { name: 'Sky', value: '#0ea5e9', row: 0 },       // sky-500
  { name: 'Cyan', value: '#06b6d4', row: 0 },      // cyan-500
  { name: 'Teal', value: '#14b8a6', row: 0 },      // teal-500
  { name: 'Emerald', value: '#10b981', row: 0 },   // emerald-500
  { name: 'Green', value: '#22c55e', row: 0 },     // green-500
  { name: 'Lime', value: '#84cc16', row: 0 },      // lime-500
  { name: 'Yellow', value: '#eab308', row: 0 },    // yellow-500
  { name: 'Amber', value: '#f59e0b', row: 0 },     // amber-500
  { name: 'Orange', value: '#f97316', row: 0 },    // orange-500
  { name: 'Red', value: '#ef4444', row: 0 },       // red-500
  { name: 'Rose', value: '#f43f5e', row: 0 },      // rose-500
  { name: 'Pink', value: '#ec4899', row: 0 },      // pink-500
  { name: 'Purple', value: '#a855f7', row: 0 },    // purple-500
  // Row 2: Light intensity (400)
  { name: 'Blue Light', value: '#60a5fa', row: 1 },     // blue-400
  { name: 'Sky Light', value: '#38bdf8', row: 1 },      // sky-400
  { name: 'Cyan Light', value: '#22d3ee', row: 1 },     // cyan-400
  { name: 'Teal Light', value: '#2dd4bf', row: 1 },     // teal-400
  { name: 'Emerald Light', value: '#34d399', row: 1 },  // emerald-400
  { name: 'Green Light', value: '#4ade80', row: 1 },    // green-400
  { name: 'Lime Light', value: '#a3e635', row: 1 },     // lime-400
  { name: 'Yellow Light', value: '#facc15', row: 1 },   // yellow-400
  { name: 'Amber Light', value: '#fbbf24', row: 1 },    // amber-400
  { name: 'Orange Light', value: '#fb923c', row: 1 },   // orange-400
  { name: 'Red Light', value: '#f87171', row: 1 },      // red-400
  { name: 'Rose Light', value: '#fb7185', row: 1 },     // rose-400
  { name: 'Pink Light', value: '#f472b6', row: 1 },     // pink-400
  { name: 'Purple Light', value: '#c084fc', row: 1 },   // purple-400
  // Row 3: Soft intensity (300)
  { name: 'Blue Soft', value: '#93c5fd', row: 2 },      // blue-300
  { name: 'Sky Soft', value: '#7dd3fc', row: 2 },       // sky-300
  { name: 'Cyan Soft', value: '#67e8f9', row: 2 },      // cyan-300
  { name: 'Teal Soft', value: '#5eead4', row: 2 },      // teal-300
  { name: 'Emerald Soft', value: '#6ee7b7', row: 2 },   // emerald-300
  { name: 'Green Soft', value: '#86efac', row: 2 },     // green-300
  { name: 'Lime Soft', value: '#bef264', row: 2 },      // lime-300
  { name: 'Yellow Soft', value: '#fde047', row: 2 },    // yellow-300
  { name: 'Amber Soft', value: '#fcd34d', row: 2 },     // amber-300
  { name: 'Orange Soft', value: '#fdba74', row: 2 },    // orange-300
  { name: 'Red Soft', value: '#fca5a5', row: 2 },       // red-300
  { name: 'Rose Soft', value: '#fda4af', row: 2 },      // rose-300
  { name: 'Pink Soft', value: '#f9a8d4', row: 2 },      // pink-300
  { name: 'Purple Soft', value: '#d8b4fe', row: 2 },    // purple-300
] as const

export type LocationColor = typeof LOCATION_COLORS[number]['value']

// Location (lightweight grouping for organizing days)
export interface Location {
  id: string
  name: string // city/area (e.g., "Barcelona", "Rome")
  color?: string // hex color for calendar view
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
  color?: string // hex color for calendar view
  locations: Location[]
  accommodations: Accommodation[]
  savedPlaces: SavedPlace[]
  days: Day[]
}

// Trip status (derived)
export type TripStatus = 'upcoming' | 'ongoing' | 'past'

// Trip member role
export type TripMemberRole = 'owner' | 'editor'

// Trip member status
export type TripMemberStatus = 'pending' | 'accepted'

// Trip member
export interface TripMember {
  id: string
  tripId: string
  userId?: string
  role: TripMemberRole
  invitedBy: string
  invitedEmail?: string
  status: TripMemberStatus
  createdAt: string
  // Populated from user data
  email?: string
  name?: string
}

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
