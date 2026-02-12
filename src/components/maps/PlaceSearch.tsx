"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Search, MapPin, Star, Loader2, Navigation } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { TextField } from "@/components/ui/text-field"
import { ScrollArea } from "@/components/ui/scroll-area"
import { searchPlaces, geocodeAddress, getPlaceDetails, PlaceSearchResult } from "@/lib/maps"
import { placeKeys } from "@/lib/hooks/use-places"
import { Coordinates } from "@/types"

interface PlaceSearchProps {
  onSelect: (place: PlaceSearchResult) => void
  placeholder?: string
  centerLocation?: Coordinates
}

export function PlaceSearch({
  onSelect,
  placeholder = "Search for a place...",
  centerLocation
}: PlaceSearchProps) {
  const queryClient = useQueryClient()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<PlaceSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [isFetchingDetails, setIsFetchingDetails] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const debounceRef = useRef<NodeJS.Timeout>()
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      setIsOpen(false)
      return
    }

    setIsSearching(true)
    setError(null)

    try {
      const places = await queryClient.fetchQuery({
        queryKey: placeKeys.search(searchQuery, centerLocation?.lat, centerLocation?.lng),
        queryFn: () => searchPlaces(searchQuery, centerLocation),
        staleTime: 5 * 60 * 1000,
      })
      setResults(places)
      // Always open dropdown if there's a query (to show "Use this address" option)
      setIsOpen(true)
    } catch {
      setError('Search failed. Check your API key.')
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, [centerLocation])

  const handleUseTypedAddress = async () => {
    if (!query.trim()) return

    setIsGeocoding(true)
    try {
      const result = await geocodeAddress(query)
      if (result) {
        onSelect({
          placeId: '',
          name: query.trim(),
          address: result.address,
          coordinates: result.coordinates
        })
        setQuery("")
        setResults([])
        setIsOpen(false)
      } else {
        setError('Could not find coordinates for this address')
      }
    } catch {
      setError('Failed to geocode address')
    } finally {
      setIsGeocoding(false)
    }
  }

  const handleInputChange = (value: string) => {
    setQuery(value)

    // Debounce search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      handleSearch(value)
    }, 300)
  }

  const handleSelectPlace = async (place: PlaceSearchResult) => {
    // Fetch full details to get photos if the place has a placeId
    if (place.placeId) {
      setIsFetchingDetails(true)
      try {
        const details = await queryClient.fetchQuery({
          queryKey: placeKeys.detail(place.placeId),
          queryFn: () => getPlaceDetails(place.placeId),
          staleTime: 20 * 60 * 1000,
        })
        if (details) {
          onSelect(details)
        } else {
          onSelect(place)
        }
      } catch {
        onSelect(place)
      } finally {
        setIsFetchingDetails(false)
      }
    } else {
      onSelect(place)
    }
    setQuery("")
    setResults([])
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 [&>svg]:w-full [&>svg]:h-full [&>svg]:stroke-[2] text-muted-foreground">
          <Search />
        </span>
        <TextField
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder}
          className="pl-9 pr-9"
          onFocus={() => results.length > 0 && setIsOpen(true)}
        />
        {(isSearching || isFetchingDetails) && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg">
          <ScrollArea className="max-h-[300px]">
            {error ? (
              <div className="p-3 text-sm text-destructive text-center">
                {error}
              </div>
            ) : (
              <div className="p-1">
                {results.map((place) => (
                  <button
                    key={place.placeId}
                    className="w-full text-left px-3 py-2 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                    onClick={() => handleSelectPlace(place)}
                  >
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{place.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {place.address}
                        </p>
                        {place.rating && (
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs text-muted-foreground">
                              {place.rating.toFixed(1)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
                {/* Use typed address option */}
                {query.trim() && (
                  <>
                    {results.length > 0 && <div className="border-t my-1" />}
                    <button
                      className="w-full text-left px-3 py-2 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                      onClick={handleUseTypedAddress}
                      disabled={isGeocoding}
                    >
                      <div className="flex items-start gap-3">
                        {isGeocoding ? (
                          <Loader2 className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0 animate-spin" />
                        ) : (
                          <Navigation className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            Use &quot;{query.trim()}&quot;
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Enter address manually
                          </p>
                        </div>
                      </div>
                    </button>
                  </>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
