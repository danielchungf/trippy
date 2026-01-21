import { createClient } from '@/lib/supabase/client'
import { Activity } from '@/types'
import { getTrip } from './trips'

// Helper to get day_id from trip_id and date
async function getDayId(tripId: string, date: string): Promise<string | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('days')
    .select('id')
    .eq('trip_id', tripId)
    .eq('date', date)
    .single()

  if (error || !data) {
    console.error('Error getting day:', error)
    return null
  }

  return data.id
}

// Add an activity to a day
export async function addActivity(tripId: string, date: string, data: Omit<Activity, 'id'>): Promise<Activity | null> {
  const supabase = createClient()

  const dayId = await getDayId(tripId, date)
  if (!dayId) return null

  // Get max sort_order for the day
  const { data: existing } = await supabase
    .from('activities')
    .select('sort_order')
    .eq('day_id', dayId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const sortOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0

  const { data: row, error } = await supabase
    .from('activities')
    .insert({
      day_id: dayId,
      saved_place_id: data.savedPlaceId || null,
      title: data.title,
      time: data.time || null,
      duration: data.duration || null,
      place_name: data.place.name,
      place_address: data.place.address,
      place_lat: data.place.coordinates.lat,
      place_lng: data.place.coordinates.lng,
      place_google_id: data.place.googlePlaceId || null,
      notes: data.notes || null,
      sort_order: sortOrder,
    })
    .select()
    .single()

  if (error || !row) {
    console.error('Error adding activity:', error)
    return null
  }

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

// Update an activity
export async function updateActivity(tripId: string, date: string, activityId: string, data: Partial<Activity>): Promise<Activity | null> {
  const supabase = createClient()

  const updateData: Record<string, unknown> = {}
  if (data.title !== undefined) updateData.title = data.title
  if (data.time !== undefined) updateData.time = data.time || null
  if (data.duration !== undefined) updateData.duration = data.duration || null
  if (data.savedPlaceId !== undefined) updateData.saved_place_id = data.savedPlaceId || null
  if (data.place !== undefined) {
    updateData.place_name = data.place.name
    updateData.place_address = data.place.address
    updateData.place_lat = data.place.coordinates.lat
    updateData.place_lng = data.place.coordinates.lng
    updateData.place_google_id = data.place.googlePlaceId || null
  }
  if (data.notes !== undefined) updateData.notes = data.notes || null

  const { data: row, error } = await supabase
    .from('activities')
    .update(updateData)
    .eq('id', activityId)
    .select()
    .single()

  if (error || !row) {
    console.error('Error updating activity:', error)
    return null
  }

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

// Delete an activity
export async function deleteActivity(tripId: string, date: string, activityId: string): Promise<boolean> {
  const supabase = createClient()

  const { error } = await supabase
    .from('activities')
    .delete()
    .eq('id', activityId)

  if (error) {
    console.error('Error deleting activity:', error)
    return false
  }

  return true
}

// Reorder activities within a day
export async function reorderActivities(tripId: string, date: string, activityIds: string[]): Promise<boolean> {
  const supabase = createClient()

  // Update sort_order for each activity
  const updates = activityIds.map((id, index) =>
    supabase
      .from('activities')
      .update({ sort_order: index })
      .eq('id', id)
  )

  const results = await Promise.all(updates)
  const hasError = results.some(r => r.error)

  if (hasError) {
    console.error('Error reordering activities')
    return false
  }

  return true
}

// Move activity to a different day
export async function moveActivity(tripId: string, fromDate: string, toDate: string, activityId: string): Promise<boolean> {
  const supabase = createClient()

  const toDayId = await getDayId(tripId, toDate)
  if (!toDayId) return false

  // Get max sort_order for the target day
  const { data: existing } = await supabase
    .from('activities')
    .select('sort_order')
    .eq('day_id', toDayId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const sortOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0

  const { error } = await supabase
    .from('activities')
    .update({ day_id: toDayId, sort_order: sortOrder })
    .eq('id', activityId)

  if (error) {
    console.error('Error moving activity:', error)
    return false
  }

  return true
}

// Update a day's name
export async function updateDayName(tripId: string, date: string, name: string | undefined): Promise<boolean> {
  const supabase = createClient()

  const { error } = await supabase
    .from('days')
    .update({ name: name || null })
    .eq('trip_id', tripId)
    .eq('date', date)

  if (error) {
    console.error('Error updating day name:', error)
    return false
  }

  return true
}

// Create activity from saved place (assign place to day)
export async function createActivityFromPlace(tripId: string, date: string, placeId: string): Promise<Activity | null> {
  const trip = await getTrip(tripId)
  if (!trip) return null

  const place = trip.savedPlaces.find(p => p.id === placeId)
  if (!place) return null

  return addActivity(tripId, date, {
    title: place.name,
    savedPlaceId: place.id,
    place: {
      name: place.name,
      address: place.address,
      coordinates: place.coordinates,
      googlePlaceId: place.googlePlaceId,
    },
    notes: place.notes,
  })
}
