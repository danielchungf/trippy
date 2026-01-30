import { Coordinates } from './index'

// Destination input by user
export interface AIDestination {
  name: string
  coordinates?: Coordinates
  googlePlaceId?: string
}

// User preferences for AI planning
export interface AIPlanPreferences {
  travelStyle: 'relaxed' | 'moderate' | 'packed'
  interests: string[]
  constraints?: string
}

// Request sent to API route
export interface AIPlanRequest {
  tripId: string
  selectedDates: string[]
  destinations: AIDestination[]
  preferences: AIPlanPreferences
}

// Generated activity from Claude
export interface AIGeneratedActivity {
  title: string
  time?: string
  duration?: number
  place: {
    name: string
    address: string
    coordinates?: Coordinates
  }
  notes?: string
}

// Generated day from Claude
export interface AIGeneratedDay {
  date: string
  name?: string
  activities: AIGeneratedActivity[]
}

// Response from Claude
export interface AIPlanResponse {
  days: AIGeneratedDay[]
}

// Available interests for selection
export const AI_INTERESTS = [
  'museums',
  'food',
  'nature',
  'nightlife',
  'shopping',
  'culture',
  'history',
  'art',
  'adventure',
  'relaxation',
] as const

export type AIInterest = typeof AI_INTERESTS[number]
