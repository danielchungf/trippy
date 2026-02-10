import { createClient } from '@/lib/supabase/client'
import { Expense, ExpenseCategory } from '@/types'

// Database row type (matching Supabase schema)
export interface ExpenseRow {
  id: string
  trip_id: string
  description: string
  amount: number
  currency: string
  converted_amount: number | null
  category: string
  date: string
  notes: string | null
}

// Convert database row to app type
export function rowToExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    description: row.description,
    amount: Number(row.amount),
    currency: row.currency,
    convertedAmount: row.converted_amount ? Number(row.converted_amount) : undefined,
    category: row.category as ExpenseCategory,
    date: row.date,
    notes: row.notes || undefined,
  }
}

// Add an expense to a trip
export async function addExpense(
  tripId: string,
  data: Omit<Expense, 'id'>
): Promise<Expense | null> {
  const supabase = createClient()

  const { data: row, error } = await supabase
    .from('expenses')
    .insert({
      trip_id: tripId,
      description: data.description,
      amount: data.amount,
      currency: data.currency,
      converted_amount: data.convertedAmount ?? null,
      category: data.category,
      date: data.date,
      notes: data.notes || null,
    })
    .select()
    .single()

  if (error || !row) {
    console.error('Error adding expense:', error)
    return null
  }

  return rowToExpense(row)
}

// Update an expense
export async function updateExpense(
  tripId: string,
  expenseId: string,
  data: Partial<Expense>
): Promise<Expense | null> {
  const supabase = createClient()

  const updateData: Record<string, unknown> = {}
  if (data.description !== undefined) updateData.description = data.description
  if (data.amount !== undefined) updateData.amount = data.amount
  if (data.currency !== undefined) updateData.currency = data.currency
  if (data.convertedAmount !== undefined) updateData.converted_amount = data.convertedAmount ?? null
  if (data.category !== undefined) updateData.category = data.category
  if (data.date !== undefined) updateData.date = data.date
  if (data.notes !== undefined) updateData.notes = data.notes || null

  const { data: row, error } = await supabase
    .from('expenses')
    .update(updateData)
    .eq('id', expenseId)
    .eq('trip_id', tripId)
    .select()
    .single()

  if (error || !row) {
    console.error('Error updating expense:', error)
    return null
  }

  return rowToExpense(row)
}

// Delete an expense
export async function deleteExpense(tripId: string, expenseId: string): Promise<boolean> {
  const supabase = createClient()

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId)
    .eq('trip_id', tripId)

  if (error) {
    console.error('Error deleting expense:', error)
    return false
  }

  return true
}
