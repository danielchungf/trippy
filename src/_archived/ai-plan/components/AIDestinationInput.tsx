"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { AIDestination } from "@/types/ai"
import { PlaceSearch } from "@/components/maps/PlaceSearch"
import { PlaceSearchResult } from "@/lib/maps"
import { Badge } from "@/components/ui/badge"

interface AIDestinationInputProps {
  destinations: AIDestination[]
  onChange: (destinations: AIDestination[]) => void
}

export function AIDestinationInput({ destinations, onChange }: AIDestinationInputProps) {
  const [searchKey, setSearchKey] = useState(0)

  const handlePlaceSelect = (place: PlaceSearchResult) => {
    // Check if already added
    if (destinations.some(d => d.googlePlaceId === place.placeId)) {
      return
    }

    const newDestination: AIDestination = {
      name: place.name,
      coordinates: place.coordinates,
      googlePlaceId: place.placeId,
    }

    onChange([...destinations, newDestination])
    // Reset search by changing key
    setSearchKey(k => k + 1)
  }

  const removeDestination = (index: number) => {
    onChange(destinations.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Add the cities or areas you want to visit. AI will distribute your days across these destinations.
      </p>

      <PlaceSearch
        key={searchKey}
        onSelect={handlePlaceSelect}
        placeholder="Search for a city (e.g., Kyoto, Tokyo)..."
      />

      {destinations.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {destinations.map((dest, index) => (
            <Badge
              key={dest.googlePlaceId || index}
              variant="secondary"
              className="pl-3 pr-1 py-1.5 flex items-center gap-1"
            >
              {dest.name}
              <button
                onClick={() => removeDestination(index)}
                className="ml-1 p-0.5 rounded-full hover:bg-neutral-200 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {destinations.length === 0 && (
        <p className="text-sm text-text-secondary italic">
          No destinations added yet
        </p>
      )}
    </div>
  )
}
