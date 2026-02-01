import { createClient } from '@/lib/supabase/client'
import { Accommodation } from '@/types'

// Add an accommodation to a trip
export async function addAccommodation(tripId: string, data: Omit<Accommodation, 'id'>): Promise<Accommodation | null> {
  const supabase = createClient()

  const { data: row, error } = await supabase
    .from('accommodations')
    .insert({
      trip_id: tripId,
      location_id: data.locationId || null,
      name: data.name,
      type: data.type,
      address: data.address,
      lat: data.coordinates?.lat || null,
      lng: data.coordinates?.lng || null,
      google_place_id: data.googlePlaceId || null,
      check_in: data.checkIn,
      check_out: data.checkOut,
      check_in_time: data.checkInTime || null,
      check_out_time: data.checkOutTime || null,
      notes: data.notes || null,
      cost: data.cost || null,
      contact: data.contact || null,
      booking_url: data.bookingUrl || null,
      selected_photo_index: data.selectedPhotoIndex ?? null,
    })
    .select()
    .single()

  if (error || !row) {
    console.error('Error adding accommodation:', error)
    return null
  }

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

// Update an accommodation
export async function updateAccommodation(tripId: string, accommodationId: string, data: Partial<Accommodation>): Promise<Accommodation | null> {
  const supabase = createClient()

  const updateData: Record<string, unknown> = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.type !== undefined) updateData.type = data.type
  if (data.address !== undefined) updateData.address = data.address
  if (data.coordinates !== undefined) {
    updateData.lat = data.coordinates?.lat || null
    updateData.lng = data.coordinates?.lng || null
  }
  if (data.googlePlaceId !== undefined) updateData.google_place_id = data.googlePlaceId || null
  if (data.checkIn !== undefined) updateData.check_in = data.checkIn
  if (data.checkOut !== undefined) updateData.check_out = data.checkOut
  if (data.checkInTime !== undefined) updateData.check_in_time = data.checkInTime || null
  if (data.checkOutTime !== undefined) updateData.check_out_time = data.checkOutTime || null
  if (data.notes !== undefined) updateData.notes = data.notes || null
  if (data.cost !== undefined) updateData.cost = data.cost || null
  if (data.contact !== undefined) updateData.contact = data.contact || null
  if (data.bookingUrl !== undefined) updateData.booking_url = data.bookingUrl || null
  if (data.locationId !== undefined) updateData.location_id = data.locationId || null
  if (data.selectedPhotoIndex !== undefined) updateData.selected_photo_index = data.selectedPhotoIndex ?? null

  const { data: row, error } = await supabase
    .from('accommodations')
    .update(updateData)
    .eq('id', accommodationId)
    .eq('trip_id', tripId)
    .select()
    .single()

  if (error || !row) {
    console.error('Error updating accommodation:', error)
    return null
  }

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

// Delete an accommodation
export async function deleteAccommodation(tripId: string, accommodationId: string): Promise<boolean> {
  const supabase = createClient()

  const { error } = await supabase
    .from('accommodations')
    .delete()
    .eq('id', accommodationId)
    .eq('trip_id', tripId)

  if (error) {
    console.error('Error deleting accommodation:', error)
    return false
  }

  return true
}
