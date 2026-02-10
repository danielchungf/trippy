import { createClient } from '@/lib/supabase/client'
import { ExchangeRate } from '@/types'

// Database row type (matching Supabase schema)
export interface ExchangeRateRow {
  id: string
  trip_id: string
  from_currency: string
  to_currency: string
  rate: number
}

// Convert database row to app type
export function rowToExchangeRate(row: ExchangeRateRow): ExchangeRate {
  return {
    id: row.id,
    fromCurrency: row.from_currency,
    toCurrency: row.to_currency,
    rate: Number(row.rate),
  }
}

// Upsert an exchange rate (insert or update based on unique constraint)
export async function upsertExchangeRate(
  tripId: string,
  fromCurrency: string,
  toCurrency: string,
  rate: number
): Promise<ExchangeRate | null> {
  const supabase = createClient()

  const { data: row, error } = await supabase
    .from('trip_exchange_rates')
    .upsert(
      {
        trip_id: tripId,
        from_currency: fromCurrency,
        to_currency: toCurrency,
        rate,
      },
      { onConflict: 'trip_id,from_currency,to_currency' }
    )
    .select()
    .single()

  if (error || !row) {
    console.error('Error upserting exchange rate:', error)
    return null
  }

  return rowToExchangeRate(row)
}

// Delete an exchange rate
export async function deleteExchangeRate(tripId: string, rateId: string): Promise<boolean> {
  const supabase = createClient()

  const { error } = await supabase
    .from('trip_exchange_rates')
    .delete()
    .eq('id', rateId)
    .eq('trip_id', tripId)

  if (error) {
    console.error('Error deleting exchange rate:', error)
    return false
  }

  return true
}
