// Place categories
export type PlaceCategory = 'food' | 'coffee' | 'shopping' | 'sights' | 'museums' | 'nature' | 'nightlife' | 'entertainment' | 'wellness' | 'other'

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
  photos?: string[] // Used when auto-creating SavedPlace from Activity
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
  selectedPhotoIndex?: number
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

// Expense category
export type ExpenseCategory =
  | 'accommodation'
  | 'food'
  | 'transport'
  | 'activities'
  | 'shopping'
  | 'other'

// Supported currencies (ISO 4217)
export const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '\u20AC' },
  { code: 'GBP', name: 'British Pound', symbol: '\u00A3' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '\u00A5' },
  { code: 'KRW', name: 'South Korean Won', symbol: '\u20A9' },
  { code: 'THB', name: 'Thai Baht', symbol: '\u0E3F' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '\u00A5' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$' },
  { code: 'INR', name: 'Indian Rupee', symbol: '\u20B9' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
] as const

export type CurrencyCode = typeof CURRENCIES[number]['code']

// Expense
export interface Expense {
  id: string
  description: string
  amount: number
  currency: string
  convertedAmount?: number
  category: ExpenseCategory
  date: string // ISO date YYYY-MM-DD
  notes?: string
}

// Exchange rate (trip-level)
export interface ExchangeRate {
  id: string
  fromCurrency: string
  toCurrency: string
  rate: number
}

// Packing item category
export type PackingCategory =
  | 'clothing'
  | 'toiletries'
  | 'electronics'
  | 'documents'
  | 'health'
  | 'accessories'
  | 'misc'

// Packing item
export interface PackingItem {
  id: string
  name: string
  category: PackingCategory
  quantity: number
  isPacked: boolean
  notes?: string
}

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
  selectedPhotoIndex?: number
  photos?: string[]
}

// Location colors - Tailwind 400 level colors
export const LOCATION_COLORS = [
  { name: 'Blue', value: 'bg-blue-400' },
  { name: 'Sky', value: 'bg-sky-400' },
  { name: 'Emerald', value: 'bg-emerald-400' },
  { name: 'Lime', value: 'bg-lime-400' },
  { name: 'Amber', value: 'bg-amber-400' },
  { name: 'Orange', value: 'bg-orange-400' },
  { name: 'Red', value: 'bg-red-400' },
  { name: 'Pink', value: 'bg-pink-400' },
  { name: 'Purple', value: 'bg-purple-400' },
  { name: 'Violet', value: 'bg-violet-400' },
  { name: 'Indigo', value: 'bg-indigo-400' },
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
  selectedPhotoIndex?: number
  photos?: string[]
}

// Trip (top-level container)
export interface Trip {
  id: string
  name: string
  startDate: string // ISO date
  endDate: string // ISO date
  coverImage?: string
  coverImageFocusX?: number // 0-1, focal point X (default 0.5 = center)
  coverImageFocusY?: number // 0-1, focal point Y (default 0.5 = center)
  color?: string // hex color for calendar view
  locations: Location[]
  accommodations: Accommodation[]
  savedPlaces: SavedPlace[]
  packingItems: PackingItem[]
  expenses: Expense[]
  exchangeRates: ExchangeRate[]
  homeCurrency: string
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
      name: existingDay?.name,
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
  const startYear = start.getFullYear()
  const endYear = end.getFullYear()

  if (startYear === endYear) {
    if (startMonth === endMonth) {
      return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${endYear}`
    }
    return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${endYear}`
  }

  return `${startMonth} ${start.getDate()}, ${startYear} - ${endMonth} ${end.getDate()}, ${endYear}`
}

// Calculate trip duration in days
export function getTripDuration(trip: Trip): number {
  const start = parseLocalDate(trip.startDate)
  const end = parseLocalDate(trip.endDate)
  const diff = end.getTime() - start.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1
}
