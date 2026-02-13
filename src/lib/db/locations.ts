import { createClient } from '@/lib/supabase/client'
import { Location, generateDaysFromTrip } from '@/types'
import { getTrip } from './trips'

// Add a location to a trip
export async function addLocation(tripId: string, data: {
  name: string
  color?: string
  startDate: string
  endDate: string
  coordinates?: { lat: number; lng: number }
  googlePlaceId?: string
  photos?: string[]
}): Promise<Location | null> {
  const supabase = createClient()

  const { data: locationRow, error } = await supabase
    .from('locations')
    .insert({
      trip_id: tripId,
      name: data.name,
      color: data.color || null,
      start_date: data.startDate,
      end_date: data.endDate,
      lat: data.coordinates?.lat || null,
      lng: data.coordinates?.lng || null,
      google_place_id: data.googlePlaceId || null,
      selected_photo_index: null,
      photos: data.photos || null,
    })
    .select()
    .single()

  if (error || !locationRow) {
    console.error('Error adding location:', error)
    return null
  }

  // Update days with location assignments
  const trip = await getTrip(tripId)
  if (trip) {
    const updatedDays = generateDaysFromTrip({ ...trip, locations: [...trip.locations, {
      id: locationRow.id,
      name: data.name,
      color: data.color,
      startDate: data.startDate,
      endDate: data.endDate,
      coordinates: data.coordinates,
      googlePlaceId: data.googlePlaceId,
    }] })

    // Update day location assignments in database (in parallel)
    await Promise.all(updatedDays.map(day =>
      supabase
        .from('days')
        .update({ location_id: day.locationId || null })
        .eq('trip_id', tripId)
        .eq('date', day.date)
    ))
  }

  return {
    id: locationRow.id,
    name: locationRow.name,
    color: locationRow.color || undefined,
    startDate: locationRow.start_date,
    endDate: locationRow.end_date,
    coordinates: locationRow.lat && locationRow.lng
      ? { lat: locationRow.lat, lng: locationRow.lng }
      : undefined,
    googlePlaceId: locationRow.google_place_id || undefined,
    selectedPhotoIndex: locationRow.selected_photo_index ?? undefined,
    photos: locationRow.photos || undefined,
  }
}

// Update a location
export async function updateLocation(tripId: string, locationId: string, data: Partial<Location>): Promise<Location | null> {
  const supabase = createClient()

  const updateData: Record<string, unknown> = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.color !== undefined) updateData.color = data.color || null
  if (data.startDate !== undefined) updateData.start_date = data.startDate
  if (data.endDate !== undefined) updateData.end_date = data.endDate
  if (data.coordinates !== undefined) {
    updateData.lat = data.coordinates?.lat || null
    updateData.lng = data.coordinates?.lng || null
  }
  if (data.googlePlaceId !== undefined) updateData.google_place_id = data.googlePlaceId || null
  if (data.selectedPhotoIndex !== undefined) updateData.selected_photo_index = data.selectedPhotoIndex ?? null
  if (data.photos !== undefined) updateData.photos = data.photos || null

  const { data: locationRow, error } = await supabase
    .from('locations')
    .update(updateData)
    .eq('id', locationId)
    .eq('trip_id', tripId)
    .select()
    .single()

  if (error || !locationRow) {
    console.error('Error updating location:', error)
    return null
  }

  // Update days with location assignments if dates changed
  if (data.startDate || data.endDate) {
    const trip = await getTrip(tripId)
    if (trip) {
      const updatedDays = generateDaysFromTrip(trip)
      await Promise.all(updatedDays.map(day =>
        supabase
          .from('days')
          .update({ location_id: day.locationId || null })
          .eq('trip_id', tripId)
          .eq('date', day.date)
      ))
    }
  }

  return {
    id: locationRow.id,
    name: locationRow.name,
    color: locationRow.color || undefined,
    startDate: locationRow.start_date,
    endDate: locationRow.end_date,
    coordinates: locationRow.lat && locationRow.lng
      ? { lat: locationRow.lat, lng: locationRow.lng }
      : undefined,
    googlePlaceId: locationRow.google_place_id || undefined,
    selectedPhotoIndex: locationRow.selected_photo_index ?? undefined,
    photos: locationRow.photos || undefined,
  }
}

// Delete a location
export async function deleteLocation(tripId: string, locationId: string): Promise<boolean> {
  const supabase = createClient()

  // Clear location references from accommodations, saved_places, and days
  await Promise.all([
    supabase.from('accommodations').update({ location_id: null }).eq('location_id', locationId),
    supabase.from('saved_places').update({ location_id: null }).eq('location_id', locationId),
    supabase.from('days').update({ location_id: null }).eq('location_id', locationId),
  ])

  const { error } = await supabase
    .from('locations')
    .delete()
    .eq('id', locationId)
    .eq('trip_id', tripId)

  if (error) {
    console.error('Error deleting location:', error)
    return false
  }

  return true
}
