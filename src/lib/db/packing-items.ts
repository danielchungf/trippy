import { createClient } from '@/lib/supabase/client'
import { PackingItem, PackingCategory } from '@/types'

// Database row type (matching Supabase schema)
export interface PackingItemRow {
  id: string
  trip_id: string
  name: string
  category: string
  quantity: number
  is_packed: boolean
  notes: string | null
  sort_order: number
}

// Convert database row to app type
export function rowToPackingItem(row: PackingItemRow): PackingItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category as PackingCategory,
    quantity: row.quantity,
    isPacked: row.is_packed,
    notes: row.notes || undefined,
  }
}

// Get all packing items for a trip
export async function getPackingItems(tripId: string): Promise<PackingItem[]> {
  const supabase = createClient()

  const { data: rows, error } = await supabase
    .from('packing_items')
    .select('*')
    .eq('trip_id', tripId)
    .order('sort_order')

  if (error || !rows) {
    console.error('Error fetching packing items:', error)
    return []
  }

  return rows.map(rowToPackingItem)
}

// Add a packing item to a trip
export async function addPackingItem(
  tripId: string,
  data: Omit<PackingItem, 'id'>
): Promise<PackingItem | null> {
  const supabase = createClient()

  // Get current max sort_order
  const { data: existing } = await supabase
    .from('packing_items')
    .select('sort_order')
    .eq('trip_id', tripId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextSortOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0

  const { data: row, error } = await supabase
    .from('packing_items')
    .insert({
      trip_id: tripId,
      name: data.name,
      category: data.category,
      quantity: data.quantity,
      is_packed: data.isPacked,
      notes: data.notes || null,
      sort_order: nextSortOrder,
    })
    .select()
    .single()

  if (error || !row) {
    console.error('Error adding packing item:', error)
    return null
  }

  return rowToPackingItem(row)
}

// Update a packing item
export async function updatePackingItem(
  tripId: string,
  itemId: string,
  data: Partial<PackingItem>
): Promise<PackingItem | null> {
  const supabase = createClient()

  const updateData: Record<string, unknown> = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.category !== undefined) updateData.category = data.category
  if (data.quantity !== undefined) updateData.quantity = data.quantity
  if (data.isPacked !== undefined) updateData.is_packed = data.isPacked
  if (data.notes !== undefined) updateData.notes = data.notes || null

  const { data: row, error } = await supabase
    .from('packing_items')
    .update(updateData)
    .eq('id', itemId)
    .eq('trip_id', tripId)
    .select()
    .single()

  if (error || !row) {
    console.error('Error updating packing item:', error)
    return null
  }

  return rowToPackingItem(row)
}

// Delete a packing item
export async function deletePackingItem(tripId: string, itemId: string): Promise<boolean> {
  const supabase = createClient()

  const { error } = await supabase
    .from('packing_items')
    .delete()
    .eq('id', itemId)
    .eq('trip_id', tripId)

  if (error) {
    console.error('Error deleting packing item:', error)
    return false
  }

  return true
}

// Toggle packed status for a packing item
export async function togglePackingItemPacked(tripId: string, itemId: string): Promise<boolean> {
  const supabase = createClient()

  // Get current status
  const { data: current, error: fetchError } = await supabase
    .from('packing_items')
    .select('is_packed')
    .eq('id', itemId)
    .eq('trip_id', tripId)
    .single()

  if (fetchError || !current) {
    console.error('Error fetching packing item:', fetchError)
    return false
  }

  // Toggle it
  const { error: updateError } = await supabase
    .from('packing_items')
    .update({ is_packed: !current.is_packed })
    .eq('id', itemId)
    .eq('trip_id', tripId)

  if (updateError) {
    console.error('Error toggling packing item:', updateError)
    return false
  }

  return true
}
