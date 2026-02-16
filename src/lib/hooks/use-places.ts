"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { getPlacePhotos } from "@/lib/maps"

// Query keys for cache management
export const placeKeys = {
  all: ["places"] as const,
  photos: (placeId: string) => [...placeKeys.all, "photos", placeId] as const,
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

// Hook to fetch place photos via Essentials-tier API call
export function usePlacePhotos(placeId: string | undefined) {
  return useQuery({
    queryKey: placeKeys.photos(placeId!),
    queryFn: () => getPlacePhotos(placeId!),
    enabled: !!placeId,
    ...PLACE_CACHE_CONFIG,
  })
}

// Hook to invalidate place photo cache (used when photo URLs expire with 403)
export function useInvalidatePlacePhotos() {
  const queryClient = useQueryClient()

  return (placeId: string) => {
    queryClient.invalidateQueries({
      queryKey: placeKeys.photos(placeId),
    })
  }
}
