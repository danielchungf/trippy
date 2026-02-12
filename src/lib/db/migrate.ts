import { createClient } from '@/lib/supabase/client'
import { getTrips as getLocalTrips, saveTrips as saveLocalTrips } from '@/lib/storage'
import { Trip } from '@/types'

const MIGRATION_KEY = 'piper_migration_complete'

/**
 * Migrates localStorage trips to Supabase for the current user.
 * Only runs once per user - marks migration as complete in localStorage.
 * After successful migration, clears the local trips data.
 */
export async function migrateLocalStorageToSupabase(): Promise<boolean> {
  // Check if migration already done
  if (typeof window !== 'undefined' && localStorage.getItem(MIGRATION_KEY)) {
    return true
  }

  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) {
    console.log('No user logged in, skipping migration')
    return false
  }
  const user = session.user

  const localTrips = getLocalTrips()
  if (localTrips.length === 0) {
    // No local data to migrate
    if (typeof window !== 'undefined') {
      localStorage.setItem(MIGRATION_KEY, 'true')
    }
    return true
  }

  console.log(`Migrating ${localTrips.length} trips from localStorage to Supabase...`)

  try {
    for (const trip of localTrips) {
      await migrateTrip(supabase, user.id, trip)
    }

    // Mark migration as complete and clear local trips
    if (typeof window !== 'undefined') {
      localStorage.setItem(MIGRATION_KEY, 'true')
      saveLocalTrips([]) // Clear local trips after successful migration
    }

    console.log('Migration complete!')
    return true
  } catch (error) {
    console.error('Migration failed:', error)
    return false
  }
}

async function migrateTrip(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  trip: Trip
): Promise<void> {
  // Insert trip
  const { data: tripRow, error: tripError } = await supabase
    .from('trips')
    .insert({
      owner_id: userId,
      name: trip.name,
      start_date: trip.startDate,
      end_date: trip.endDate,
      cover_image: trip.coverImage || null,
      color: trip.color || null,
    })
    .select()
    .single()

  if (tripError || !tripRow) {
    throw new Error(`Failed to insert trip: ${tripError?.message}`)
  }

  const tripId = tripRow.id

  // Create a map of old location IDs to new location IDs
  const locationIdMap = new Map<string, string>()

  // Insert locations
  for (const location of trip.locations) {
    const { data: locRow, error: locError } = await supabase
      .from('locations')
      .insert({
        trip_id: tripId,
        name: location.name,
        color: location.color || null,
        start_date: location.startDate,
        end_date: location.endDate,
        lat: location.coordinates?.lat || null,
        lng: location.coordinates?.lng || null,
        google_place_id: location.googlePlaceId || null,
      })
      .select()
      .single()

    if (locError || !locRow) {
      console.error(`Failed to insert location: ${locError?.message}`)
      continue
    }

    locationIdMap.set(location.id, locRow.id)
  }

  // Create a map of old saved place IDs to new saved place IDs
  const savedPlaceIdMap = new Map<string, string>()

  // Insert saved places
  for (const place of trip.savedPlaces) {
    const { data: placeRow, error: placeError } = await supabase
      .from('saved_places')
      .insert({
        trip_id: tripId,
        location_id: place.locationId ? locationIdMap.get(place.locationId) || null : null,
        name: place.name,
        google_place_id: place.googlePlaceId || null,
        address: place.address,
        lat: place.coordinates.lat,
        lng: place.coordinates.lng,
        category: place.category,
        notes: place.notes || null,
        photos: place.photos || null,
      })
      .select()
      .single()

    if (placeError || !placeRow) {
      console.error(`Failed to insert saved place: ${placeError?.message}`)
      continue
    }

    savedPlaceIdMap.set(place.id, placeRow.id)
  }

  // Insert accommodations
  for (const accommodation of trip.accommodations) {
    const { error: accError } = await supabase
      .from('accommodations')
      .insert({
        trip_id: tripId,
        location_id: accommodation.locationId ? locationIdMap.get(accommodation.locationId) || null : null,
        name: accommodation.name,
        type: accommodation.type,
        address: accommodation.address,
        lat: accommodation.coordinates?.lat || null,
        lng: accommodation.coordinates?.lng || null,
        google_place_id: accommodation.googlePlaceId || null,
        check_in: accommodation.checkIn,
        check_out: accommodation.checkOut,
        check_in_time: accommodation.checkInTime || null,
        check_out_time: accommodation.checkOutTime || null,
        notes: accommodation.notes || null,
        cost: accommodation.cost || null,
        contact: accommodation.contact || null,
        booking_url: accommodation.bookingUrl || null,
      })

    if (accError) {
      console.error(`Failed to insert accommodation: ${accError.message}`)
    }
  }

  // Create a map of dates to day IDs for inserting activities
  const dayIdMap = new Map<string, string>()

  // Insert days
  for (const day of trip.days) {
    const { data: dayRow, error: dayError } = await supabase
      .from('days')
      .insert({
        trip_id: tripId,
        date: day.date,
        name: day.name || null,
        location_id: day.locationId ? locationIdMap.get(day.locationId) || null : null,
      })
      .select()
      .single()

    if (dayError || !dayRow) {
      console.error(`Failed to insert day: ${dayError?.message}`)
      continue
    }

    dayIdMap.set(day.date, dayRow.id)

    // Insert activities for this day
    for (let i = 0; i < day.activities.length; i++) {
      const activity = day.activities[i]
      const { error: actError } = await supabase
        .from('activities')
        .insert({
          day_id: dayRow.id,
          saved_place_id: activity.savedPlaceId ? savedPlaceIdMap.get(activity.savedPlaceId) || null : null,
          title: activity.title,
          time: activity.time || null,
          duration: activity.duration || null,
          place_name: activity.place.name,
          place_address: activity.place.address,
          place_lat: activity.place.coordinates.lat,
          place_lng: activity.place.coordinates.lng,
          place_google_id: activity.place.googlePlaceId || null,
          notes: activity.notes || null,
          sort_order: i,
        })

      if (actError) {
        console.error(`Failed to insert activity: ${actError.message}`)
      }
    }
  }
}
