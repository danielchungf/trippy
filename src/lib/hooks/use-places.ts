"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { getPlaceDetails, searchPlaces, PlaceSearchResult } from "@/lib/maps"
import { Coordinates } from "@/types"

// Query keys for cache management
export const placeKeys = {
  all: ["places"] as const,
  details: () => [...placeKeys.all, "detail"] as const,
  detail: (placeId: string) => [...placeKeys.details(), placeId] as const,
  searches: () => [...placeKeys.all, "search"] as const,
  search: (query: string, lat?: number, lng?: number) =>
    [...placeKeys.searches(), query, lat, lng] as const,
}

// Cache config for place data
// staleTime 20min, gcTime 1hr — well under 24hr photo URL expiry
const PLACE_CACHE_CONFIG = {
  staleTime: 20 * 60 * 1000,
  gcTime: 60 * 60 * 1000,
  refetchOnWindowFocus: false as const,
  retry: 1,
}

// Hook to fetch place details (used by PlacePhoto, etc.)
export function usePlaceDetails(placeId: string | undefined) {
  return useQuery({
    queryKey: placeKeys.detail(placeId!),
    queryFn: () => getPlaceDetails(placeId!),
    enabled: !!placeId,
    ...PLACE_CACHE_CONFIG,
  })
}

// Hook to invalidate place photo cache (used when photo URLs expire with 403)
export function useInvalidatePlacePhotos() {
  const queryClient = useQueryClient()

  return (placeId: string) => {
    queryClient.invalidateQueries({
      queryKey: placeKeys.detail(placeId),
    })
  }
}
