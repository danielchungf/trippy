import { createClient } from '@/lib/supabase/client'
import { Trip, Location, Accommodation, SavedPlace, Day, Activity, generateDaysFromTrip } from '@/types'

// Database row types (matching Supabase schema)
interface TripRow {
  id: string
  owner_id: string
  name: string
  start_date: string
  end_date: string
  cover_image: string | null
  color: string | null
  created_at: string
  updated_at: string
}

interface LocationRow {
  id: string
  trip_id: string
  name: string
  color: string | null
  start_date: string
  end_date: string
  lat: number | null
  lng: number | null
  google_place_id: string | null
}

interface AccommodationRow {
  id: string
  trip_id: string
  location_id: string | null
  name: string
  type: string
  address: string
  lat: number | null
  lng: number | null
  google_place_id: string | null
  check_in: string
  check_out: string
  check_in_time: string | null
  check_out_time: string | null
  notes: string | null
  cost: number | null
  contact: string | null
  booking_url: string | null
}

interface SavedPlaceRow {
  id: string
  trip_id: string
  location_id: string | null
  name: string
  google_place_id: string | null
  address: string
  lat: number
  lng: number
  category: string
  notes: string | null
  photos: string[] | null
}

interface DayRow {
  id: string
  trip_id: string
  date: string
  name: string | null
  location_id: string | null
}

interface ActivityRow {
  id: string
  day_id: string
  saved_place_id: string | null
  title: string
  time: string | null
  duration: number | null
  place_name: string
  place_address: string
  place_lat: number
  place_lng: number
  place_google_id: string | null
  notes: string | null
  sort_order: number
}

// Convert database row to app types
function rowToLocation(row: LocationRow): Location {
  return {
    id: row.id,
    name: row.name,
    color: row.color || undefined,
    startDate: row.start_date,
    endDate: row.end_date,
    coordinates: row.lat && row.lng ? { lat: row.lat, lng: row.lng } : undefined,
    googlePlaceId: row.google_place_id || undefined,
  }
}

function rowToAccommodation(row: AccommodationRow): Accommodation {
  return {
    id: row.id,
    name: row.name,
    type: row.type as Accommodation['type'],
    address: row.address,
    coordinates: row.lat && row.lng ? { lat: row.lat, lng: row.lng } : undefined,
    googlePlaceId: row.google_place_id || undefined,
    checkIn: row.check_in,
    checkOut: row.check_out,
    checkInTime: row.check_in_time || undefined,
    checkOutTime: row.check_out_time || undefined,
    notes: row.notes || undefined,
    cost: row.cost || undefined,
    contact: row.contact || undefined,
    bookingUrl: row.booking_url || undefined,
    locationId: row.location_id || undefined,
  }
}

function rowToSavedPlace(row: SavedPlaceRow): SavedPlace {
  return {
    id: row.id,
    name: row.name,
    googlePlaceId: row.google_place_id || undefined,
    address: row.address,
    coordinates: { lat: row.lat, lng: row.lng },
    category: row.category,
    notes: row.notes || undefined,
    photos: row.photos || undefined,
    locationId: row.location_id || undefined,
  }
}

function rowToActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    title: row.title,
    time: row.time || undefined,
    duration: row.duration || undefined,
    savedPlaceId: row.saved_place_id || undefined,
    place: {
      name: row.place_name,
      address: row.place_address,
      coordinates: { lat: row.place_lat, lng: row.place_lng },
      googlePlaceId: row.place_google_id || undefined,
    },
    notes: row.notes || undefined,
  }
}

// Extended trip with ownership info
export interface TripWithOwnership extends Trip {
  isOwner: boolean
}

// Get all trips for the current user (owned + shared)
export async function getTrips(): Promise<TripWithOwnership[]> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  console.log('getTrips: Fetching for user', user.id, user.email)

  // Get trip IDs where user is a member (editor)
  const { data: memberTrips, error: memberError } = await supabase
    .from('trip_members')
    .select('trip_id')
    .eq('user_id', user.id)
    .eq('status', 'accepted')
    .eq('role', 'editor')

  console.log('getTrips: memberTrips query result:', memberTrips, 'Error:', memberError)

  const sharedTripIds = memberTrips?.map(m => m.trip_id) || []
  console.log('getTrips: sharedTripIds:', sharedTripIds)

  // Fetch trips owned by user OR shared with user
  let query = supabase
    .from('trips')
    .select('*')
    .order('start_date', { ascending: true })

  if (sharedTripIds.length > 0) {
    query = query.or(`owner_id.eq.${user.id},id.in.(${sharedTripIds.join(',')})`)
  } else {
    query = query.eq('owner_id', user.id)
  }

  const { data: tripRows, error: tripError } = await query

  if (tripError || !tripRows) {
    console.error('Error fetching trips:', tripError)
    return []
  }

  // Fetch all related data in parallel
  const tripIds = tripRows.map(t => t.id)

  const [locationsResult, accommodationsResult, savedPlacesResult, daysResult] = await Promise.all([
    supabase.from('locations').select('*').in('trip_id', tripIds),
    supabase.from('accommodations').select('*').in('trip_id', tripIds),
    supabase.from('saved_places').select('*').in('trip_id', tripIds),
    supabase.from('days').select('*').in('trip_id', tripIds),
  ])

  // Fetch activities for all days
  const dayIds = (daysResult.data || []).map(d => d.id)
  const activitiesResult = dayIds.length > 0
    ? await supabase.from('activities').select('*').in('day_id', dayIds).order('sort_order')
    : { data: [] }

  // Build trips with related data
  return tripRows.map((tripRow: TripRow) => {
    const locations = (locationsResult.data || [])
      .filter((l: LocationRow) => l.trip_id === tripRow.id)
      .map(rowToLocation)

    const accommodations = (accommodationsResult.data || [])
      .filter((a: AccommodationRow) => a.trip_id === tripRow.id)
      .map(rowToAccommodation)

    const savedPlaces = (savedPlacesResult.data || [])
      .filter((p: SavedPlaceRow) => p.trip_id === tripRow.id)
      .map(rowToSavedPlace)

    const dayRows = (daysResult.data || [])
      .filter((d: DayRow) => d.trip_id === tripRow.id)

    const days: Day[] = dayRows.map((dayRow: DayRow) => {
      const activities = (activitiesResult.data || [])
        .filter((a: ActivityRow) => a.day_id === dayRow.id)
        .map(rowToActivity)

      return {
        date: dayRow.date,
        name: dayRow.name || undefined,
        locationId: dayRow.location_id || undefined,
        activities,
      }
    })

    const trip: TripWithOwnership = {
      id: tripRow.id,
      name: tripRow.name,
      startDate: tripRow.start_date,
      endDate: tripRow.end_date,
      coverImage: tripRow.cover_image || undefined,
      color: tripRow.color || undefined,
      locations,
      accommodations,
      savedPlaces,
      days,
      isOwner: tripRow.owner_id === user.id,
    }

    // Generate days if none exist (ensures all dates have a day entry)
    if (days.length === 0) {
      trip.days = generateDaysFromTrip(trip)
    }

    return trip
  })
}

// Get a single trip by ID
export async function getTrip(id: string): Promise<TripWithOwnership | undefined> {
  const trips = await getTrips()
  return trips.find(t => t.id === id)
}

// Create a new trip
export async function createTrip(data: {
  name: string
  startDate: string
  endDate: string
  coverImage?: string
  color?: string
}): Promise<Trip | null> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: tripRow, error } = await supabase
    .from('trips')
    .insert({
      owner_id: user.id,
      name: data.name,
      start_date: data.startDate,
      end_date: data.endDate,
      cover_image: data.coverImage || null,
      color: data.color || null,
    })
    .select()
    .single()

  if (error || !tripRow) {
    console.error('Error creating trip:', error)
    return null
  }

  const trip: Trip = {
    id: tripRow.id,
    name: tripRow.name,
    startDate: tripRow.start_date,
    endDate: tripRow.end_date,
    coverImage: tripRow.cover_image || undefined,
    color: tripRow.color || undefined,
    locations: [],
    accommodations: [],
    savedPlaces: [],
    days: [],
  }

  // Generate days for the trip
  trip.days = generateDaysFromTrip(trip)

  // Insert days into database
  const dayInserts = trip.days.map((day, index) => ({
    trip_id: trip.id,
    date: day.date,
    name: day.name || null,
    location_id: day.locationId || null,
  }))

  if (dayInserts.length > 0) {
    await supabase.from('days').insert(dayInserts)
  }

  return trip
}

// Update a trip
export async function updateTrip(id: string, data: Partial<Trip>): Promise<Trip | null> {
  const supabase = createClient()

  const updateData: Record<string, unknown> = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.startDate !== undefined) updateData.start_date = data.startDate
  if (data.endDate !== undefined) updateData.end_date = data.endDate
  if (data.coverImage !== undefined) updateData.cover_image = data.coverImage || null
  if (data.color !== undefined) updateData.color = data.color || null

  const { data: tripRow, error } = await supabase
    .from('trips')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error || !tripRow) {
    console.error('Error updating trip:', error)
    return null
  }

  // If dates changed, regenerate days
  if (data.startDate || data.endDate) {
    const trip = await getTrip(id)
    if (trip) {
      const newDays = generateDaysFromTrip(trip)

      // Delete existing days and recreate
      await supabase.from('days').delete().eq('trip_id', id)

      const dayInserts = newDays.map(day => ({
        trip_id: id,
        date: day.date,
        name: day.name || null,
        location_id: day.locationId || null,
      }))

      if (dayInserts.length > 0) {
        await supabase.from('days').insert(dayInserts)
      }
    }
  }

  return (await getTrip(id)) ?? null
}

// Delete a trip
export async function deleteTrip(id: string): Promise<boolean> {
  const supabase = createClient()

  // Days, activities, and other related data will be deleted via cascade
  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting trip:', error)
    return false
  }

  return true
}
