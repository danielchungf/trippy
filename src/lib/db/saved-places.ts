import { createClient } from '@/lib/supabase/client'
import { SavedPlace } from '@/types'

// Add a saved place to a trip
export async function addSavedPlace(tripId: string, data: Omit<SavedPlace, 'id'>): Promise<SavedPlace | null> {
  const supabase = createClient()

  const { data: row, error } = await supabase
    .from('saved_places')
    .insert({
      trip_id: tripId,
      location_id: data.locationId || null,
      name: data.name,
      google_place_id: data.googlePlaceId || null,
      address: data.address,
      lat: data.coordinates.lat,
      lng: data.coordinates.lng,
      category: data.category,
      notes: data.notes || null,
      photos: data.photos || null,
      selected_photo_index: data.selectedPhotoIndex ?? null,
    })
    .select()
    .single()

  if (error || !row) {
    console.error('Error adding saved place:', error)
    return null
  }

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

// Update a saved place
export async function updateSavedPlace(tripId: string, placeId: string, data: Partial<SavedPlace>): Promise<SavedPlace | null> {
  const supabase = createClient()

  const updateData: Record<string, unknown> = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.googlePlaceId !== undefined) updateData.google_place_id = data.googlePlaceId || null
  if (data.address !== undefined) updateData.address = data.address
  if (data.coordinates !== undefined) {
    updateData.lat = data.coordinates.lat
    updateData.lng = data.coordinates.lng
  }
  if (data.category !== undefined) updateData.category = data.category
  if (data.notes !== undefined) updateData.notes = data.notes || null
  if (data.photos !== undefined) updateData.photos = data.photos || null
  if (data.locationId !== undefined) updateData.location_id = data.locationId || null
  if (data.selectedPhotoIndex !== undefined) updateData.selected_photo_index = data.selectedPhotoIndex ?? null

  const { data: row, error } = await supabase
    .from('saved_places')
    .update(updateData)
    .eq('id', placeId)
    .eq('trip_id', tripId)
    .select()
    .single()

  if (error || !row) {
    console.error('Error updating saved place:', error)
    return null
  }

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

// Delete a saved place
export async function deleteSavedPlace(tripId: string, placeId: string): Promise<boolean> {
  const supabase = createClient()

  // Clear saved_place_id references from activities
  await supabase
    .from('activities')
    .update({ saved_place_id: null })
    .eq('saved_place_id', placeId)

  const { error } = await supabase
    .from('saved_places')
    .delete()
    .eq('id', placeId)
    .eq('trip_id', tripId)

  if (error) {
    console.error('Error deleting saved place:', error)
    return false
  }

  return true
}

// Add multiple saved places in bulk
export async function addSavedPlaces(
  tripId: string,
  places: Omit<SavedPlace, 'id'>[]
): Promise<{ success: SavedPlace[]; failed: number }> {
  const supabase = createClient()

  const rows = places.map(data => ({
    trip_id: tripId,
    location_id: data.locationId || null,
    name: data.name,
    google_place_id: data.googlePlaceId || null,
    address: data.address,
    lat: data.coordinates.lat,
    lng: data.coordinates.lng,
    category: data.category,
    notes: data.notes || null,
    photos: data.photos || null,
    selected_photo_index: data.selectedPhotoIndex ?? null,
  }))

  const { data: insertedRows, error } = await supabase
    .from('saved_places')
    .insert(rows)
    .select()

  if (error) {
    console.error('Error adding saved places:', error)
    return { success: [], failed: places.length }
  }

  const successPlaces: SavedPlace[] = (insertedRows || []).map(row => ({
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
  }))

  return { success: successPlaces, failed: places.length - successPlaces.length }
}
