import { createClient } from '@/lib/supabase/client'
import { AIPlanResponse, AIGeneratedActivity } from '@/types/ai'
import { addActivity, updateDayName } from '@/lib/db'
import { searchPlaces } from '@/lib/maps'
import { PlaceInfo } from '@/types'

// Look up a place using Google Maps to get real coordinates
async function enrichPlace(activity: AIGeneratedActivity): Promise<PlaceInfo> {
  try {
    // Search for the place by name and address
    const query = `${activity.place.name} ${activity.place.address}`
    const results = await searchPlaces(query)

    if (results.length > 0) {
      const bestMatch = results[0]
      return {
        name: activity.place.name, // Keep AI-suggested name
        address: bestMatch.address,
        coordinates: bestMatch.coordinates,
        googlePlaceId: bestMatch.placeId,
      }
    }

    // Fallback: try just the place name
    const nameResults = await searchPlaces(activity.place.name)
    if (nameResults.length > 0) {
      const bestMatch = nameResults[0]
      return {
        name: activity.place.name,
        address: bestMatch.address,
        coordinates: bestMatch.coordinates,
        googlePlaceId: bestMatch.placeId,
      }
    }
  } catch (error) {
    console.error('Error enriching place:', activity.place.name, error)
  }

  // Return original data if enrichment fails (with 0,0 coordinates)
  return {
    name: activity.place.name,
    address: activity.place.address,
    coordinates: activity.place.coordinates || { lat: 0, lng: 0 },
    googlePlaceId: undefined,
  }
}

// Apply AI-generated plan to the database
// This will delete existing activities for the selected dates and add new ones
export async function applyAIPlan(
  tripId: string,
  plan: AIPlanResponse,
  selectedDates: string[]
): Promise<boolean> {
  const supabase = createClient()

  try {
    // 1. Get day IDs for selected dates
    const { data: days, error: daysError } = await supabase
      .from('days')
      .select('id, date')
      .eq('trip_id', tripId)
      .in('date', selectedDates)

    if (daysError || !days) {
      console.error('Error fetching days:', daysError)
      return false
    }

    const dayIdsByDate = new Map(days.map(d => [d.date, d.id]))

    // 2. Delete existing activities for selected dates
    const dayIds = days.map(d => d.id)
    if (dayIds.length > 0) {
      const { error: deleteError } = await supabase
        .from('activities')
        .delete()
        .in('day_id', dayIds)

      if (deleteError) {
        console.error('Error deleting activities:', deleteError)
        return false
      }
    }

    // 3. Add new activities from the AI plan (with place enrichment)
    for (const day of plan.days) {
      const dayId = dayIdsByDate.get(day.date)
      if (!dayId) {
        console.warn(`No day found for date: ${day.date}`)
        continue
      }

      // Update day name if provided
      if (day.name) {
        await updateDayName(tripId, day.date, day.name)
      }

      // Add each activity with enriched place data
      for (const activity of day.activities) {
        // Enrich place with Google Maps data to get real coordinates
        const enrichedPlace = await enrichPlace(activity)

        await addActivity(tripId, day.date, {
          title: activity.title,
          time: activity.time,
          duration: activity.duration,
          place: enrichedPlace,
          notes: activity.notes,
        })
      }
    }

    return true
  } catch (error) {
    console.error('Error applying AI plan:', error)
    return false
  }
}
