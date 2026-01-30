"use client"

import { AIPlanPreferences, AI_INTERESTS, AIInterest } from "@/types/ai"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface AIPreferencesFormProps {
  preferences: AIPlanPreferences
  onChange: (preferences: AIPlanPreferences) => void
}

const TRAVEL_STYLES = [
  { value: 'relaxed' as const, label: 'Relaxed', description: '2-3 activities per day' },
  { value: 'moderate' as const, label: 'Moderate', description: '3-4 activities per day' },
  { value: 'packed' as const, label: 'Packed', description: '5-6 activities per day' },
]

const INTEREST_LABELS: Record<AIInterest, string> = {
  museums: 'Museums',
  food: 'Food & Dining',
  nature: 'Nature',
  nightlife: 'Nightlife',
  shopping: 'Shopping',
  culture: 'Culture',
  history: 'History',
  art: 'Art',
  adventure: 'Adventure',
  relaxation: 'Relaxation',
}

export function AIPreferencesForm({ preferences, onChange }: AIPreferencesFormProps) {
  const toggleInterest = (interest: AIInterest) => {
    const newInterests = preferences.interests.includes(interest)
      ? preferences.interests.filter(i => i !== interest)
      : [...preferences.interests, interest]
    onChange({ ...preferences, interests: newInterests })
  }

  return (
    <div className="space-y-6">
      {/* Travel Style */}
      <div className="space-y-3">
        <Label>Travel Style</Label>
        <div className="grid grid-cols-3 gap-2">
          {TRAVEL_STYLES.map(style => (
            <button
              key={style.value}
              onClick={() => onChange({ ...preferences, travelStyle: style.value })}
              className={cn(
                "p-3 rounded-lg border text-left transition-colors",
                preferences.travelStyle === style.value
                  ? "bg-neutral-800 text-white border-neutral-800"
                  : "bg-white hover:bg-neutral-50 border-neutral-200"
              )}
            >
              <div className="font-medium text-sm">{style.label}</div>
              <div className={cn(
                "text-xs",
                preferences.travelStyle === style.value ? "text-white/70" : "text-text-secondary"
              )}>
                {style.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Interests */}
      <div className="space-y-3">
        <Label>Interests (select at least one)</Label>
        <div className="flex flex-wrap gap-2">
          {AI_INTERESTS.map(interest => (
            <button
              key={interest}
              onClick={() => toggleInterest(interest)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm transition-colors border",
                preferences.interests.includes(interest)
                  ? "bg-neutral-800 text-white border-neutral-800"
                  : "bg-white hover:bg-neutral-50 border-neutral-200"
              )}
            >
              {INTEREST_LABELS[interest]}
            </button>
          ))}
        </div>
      </div>

      {/* Constraints */}
      <div className="space-y-2">
        <Label htmlFor="constraints">Special Requirements (optional)</Label>
        <Textarea
          id="constraints"
          placeholder="E.g., vegetarian food only, avoid stairs, traveling with kids..."
          value={preferences.constraints || ''}
          onChange={(e) => onChange({ ...preferences, constraints: e.target.value })}
          rows={2}
        />
      </div>
    </div>
  )
}
