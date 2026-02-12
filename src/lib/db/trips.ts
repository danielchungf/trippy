import { createClient } from '@/lib/supabase/client'
import { Trip, Location, Accommodation, SavedPlace, Day, Activity, PackingItem, Expense, ExchangeRate, generateDaysFromTrip } from '@/types'
import { PackingItemRow, rowToPackingItem } from './packing-items'
import { ExpenseRow, rowToExpense } from './expenses'
import { ExchangeRateRow, rowToExchangeRate } from './exchange-rates'

// Database row types (matching Supabase schema)
interface TripRow {
  id: string
  owner_id: string
  name: string
  start_date: string
  end_date: string
  cover_image: string | null
  cover_image_focus_x: number | null
  cover_image_focus_y: number | null
  color: string | null
  home_currency: string
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
  selected_photo_index: number | null
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
  selected_photo_index: number | null
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
  selected_photo_index: number | null
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
    selectedPhotoIndex: row.selected_photo_index ?? undefined,
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
    selectedPhotoIndex: row.selected_photo_index ?? undefined,
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
    selectedPhotoIndex: row.selected_photo_index ?? undefined,
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

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return []
  const user = session.user

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

  const [locationsResult, accommodationsResult, savedPlacesResult, packingItemsResult, daysResult, expensesResult, exchangeRatesResult] = await Promise.all([
    supabase.from('locations').select('*').in('trip_id', tripIds),
    supabase.from('accommodations').select('*').in('trip_id', tripIds),
    supabase.from('saved_places').select('*').in('trip_id', tripIds),
    supabase.from('packing_items').select('*').in('trip_id', tripIds).order('sort_order'),
    supabase.from('days').select('*').in('trip_id', tripIds),
    supabase.from('expenses').select('*').in('trip_id', tripIds).order('date', { ascending: false }),
    supabase.from('trip_exchange_rates').select('*').in('trip_id', tripIds),
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

    const packingItems = (packingItemsResult.data || [])
      .filter((p: PackingItemRow) => p.trip_id === tripRow.id)
      .map(rowToPackingItem)

    const expenses = (expensesResult.data || [])
      .filter((e: ExpenseRow) => e.trip_id === tripRow.id)
      .map(rowToExpense)

    const exchangeRates = (exchangeRatesResult.data || [])
      .filter((r: ExchangeRateRow) => r.trip_id === tripRow.id)
      .map(rowToExchangeRate)

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
      coverImageFocusX: tripRow.cover_image_focus_x ?? 0.5,
      coverImageFocusY: tripRow.cover_image_focus_y ?? 0.5,
      color: tripRow.color || undefined,
      locations,
      accommodations,
      savedPlaces,
      packingItems,
      expenses,
      exchangeRates,
      homeCurrency: tripRow.home_currency || 'USD',
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

// Get a single trip by ID (optimized - queries only this trip)
export async function getTrip(id: string): Promise<TripWithOwnership | undefined> {
  const supabase = createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return undefined
  const user = session.user

  // Fetch the specific trip
  const { data: tripRow, error: tripError } = await supabase
    .from('trips')
    .select('*')
    .eq('id', id)
    .single()

  if (tripError || !tripRow) {
    return undefined
  }

  // Check if user has access (owner or shared member)
  const isOwner = tripRow.owner_id === user.id
  if (!isOwner) {
    const { data: membership } = await supabase
      .from('trip_members')
      .select('id')
      .eq('trip_id', id)
      .eq('user_id', user.id)
      .eq('status', 'accepted')
      .single()

    if (!membership) {
      return undefined // User doesn't have access
    }
  }

  // Fetch all related data in parallel
  const [locationsResult, accommodationsResult, savedPlacesResult, packingItemsResult, daysResult, expensesResult, exchangeRatesResult] = await Promise.all([
    supabase.from('locations').select('*').eq('trip_id', id),
    supabase.from('accommodations').select('*').eq('trip_id', id),
    supabase.from('saved_places').select('*').eq('trip_id', id),
    supabase.from('packing_items').select('*').eq('trip_id', id).order('sort_order'),
    supabase.from('days').select('*').eq('trip_id', id),
    supabase.from('expenses').select('*').eq('trip_id', id).order('date', { ascending: false }),
    supabase.from('trip_exchange_rates').select('*').eq('trip_id', id),
  ])

  // Fetch activities for all days
  const dayIds = (daysResult.data || []).map(d => d.id)
  const activitiesResult = dayIds.length > 0
    ? await supabase.from('activities').select('*').in('day_id', dayIds).order('sort_order')
    : { data: [] }

  const locations = (locationsResult.data || []).map(rowToLocation)
  const accommodations = (accommodationsResult.data || []).map(rowToAccommodation)
  const savedPlaces = (savedPlacesResult.data || []).map(rowToSavedPlace)
  const packingItems = (packingItemsResult.data || []).map(rowToPackingItem)
  const expenses = (expensesResult.data || []).map(rowToExpense)
  const exchangeRates = (exchangeRatesResult.data || []).map(rowToExchangeRate)

  const days: Day[] = (daysResult.data || []).map((dayRow: DayRow) => {
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
    coverImageFocusX: tripRow.cover_image_focus_x ?? 0.5,
    coverImageFocusY: tripRow.cover_image_focus_y ?? 0.5,
    color: tripRow.color || undefined,
    locations,
    accommodations,
    savedPlaces,
    packingItems,
    expenses,
    exchangeRates,
    homeCurrency: tripRow.home_currency || 'USD',
    days,
    isOwner,
  }

  // Generate days if none exist
  if (days.length === 0) {
    trip.days = generateDaysFromTrip(trip)
  }

  return trip
}

// Create a new trip
export async function createTrip(data: {
  name: string
  startDate: string
  endDate: string
  coverImage?: string
  coverImageFocusX?: number
  coverImageFocusY?: number
  color?: string
}): Promise<Trip | null> {
  const supabase = createClient()

  // Force a fresh token by calling getUser() which validates server-side
  // and triggers a token refresh if the access token is expired.
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    console.error('createTrip: auth failed', authError?.message)
    return null
  }

  // Use RPC function (SECURITY DEFINER) to bypass RLS for trip creation.
  // Passes user.id as fallback in case auth.uid() is NULL in the DB context.
  const { data: tripJson, error } = await supabase.rpc('create_trip_for_user', {
    p_name: data.name,
    p_start_date: data.startDate,
    p_end_date: data.endDate,
    p_cover_image: data.coverImage || null,
    p_cover_image_focus_x: data.coverImageFocusX ?? 0.5,
    p_cover_image_focus_y: data.coverImageFocusY ?? 0.5,
    p_color: data.color || null,
    p_home_currency: 'USD',
    p_user_id: user.id,
  })

  if (error || !tripJson) {
    console.error('Error creating trip:', error?.message, error?.code)
    return null
  }

  const tripRow = tripJson as TripRow

  const trip: Trip = {
    id: tripRow.id,
    name: tripRow.name,
    startDate: tripRow.start_date,
    endDate: tripRow.end_date,
    coverImage: tripRow.cover_image || undefined,
    coverImageFocusX: tripRow.cover_image_focus_x ?? 0.5,
    coverImageFocusY: tripRow.cover_image_focus_y ?? 0.5,
    color: tripRow.color || undefined,
    locations: [],
    accommodations: [],
    savedPlaces: [],
    packingItems: [],
    expenses: [],
    exchangeRates: [],
    homeCurrency: 'USD',
    days: [],
  }

  // Generate days for the trip
  trip.days = generateDaysFromTrip(trip)

  // Insert days into database
  const dayInserts = trip.days.map((day) => ({
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

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return null
  const user = session.user

  // Verify user has access to this trip (owner or accepted member)
  const { data: currentTrip } = await supabase
    .from('trips')
    .select('start_date, end_date, owner_id')
    .eq('id', id)
    .single()

  if (!currentTrip) return null

  const isOwner = currentTrip.owner_id === user.id
  if (!isOwner) {
    const { data: membership } = await supabase
      .from('trip_members')
      .select('id')
      .eq('trip_id', id)
      .eq('user_id', user.id)
      .eq('status', 'accepted')
      .single()

    if (!membership) return null
  }

  const updateData: Record<string, unknown> = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.startDate !== undefined) updateData.start_date = data.startDate
  if (data.endDate !== undefined) updateData.end_date = data.endDate
  if (data.coverImage !== undefined) updateData.cover_image = data.coverImage || null
  if (data.coverImageFocusX !== undefined) updateData.cover_image_focus_x = data.coverImageFocusX
  if (data.coverImageFocusY !== undefined) updateData.cover_image_focus_y = data.coverImageFocusY
  if (data.color !== undefined) updateData.color = data.color || null
  if (data.homeCurrency !== undefined) updateData.home_currency = data.homeCurrency

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

  // Only regenerate days if dates actually changed
  const datesChanged = currentTrip && (
    (data.startDate && data.startDate !== currentTrip.start_date) ||
    (data.endDate && data.endDate !== currentTrip.end_date)
  )

  if (datesChanged) {
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

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return false
  const user = session.user

  // Only the trip owner can delete a trip
  const { data: trip } = await supabase
    .from('trips')
    .select('owner_id')
    .eq('id', id)
    .single()

  if (!trip || trip.owner_id !== user.id) return false

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
