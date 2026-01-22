"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getTrips,
  getTrip,
  createTrip,
  updateTrip,
  deleteTrip,
  TripWithOwnership,
} from "@/lib/db"
import { Trip } from "@/types"

// Query keys for cache management
export const tripKeys = {
  all: ["trips"] as const,
  lists: () => [...tripKeys.all, "list"] as const,
  list: () => [...tripKeys.lists()] as const,
  details: () => [...tripKeys.all, "detail"] as const,
  detail: (id: string) => [...tripKeys.details(), id] as const,
}

// Hook to fetch all trips (for home page)
export function useTrips() {
  return useQuery({
    queryKey: tripKeys.list(),
    queryFn: getTrips,
  })
}

// Hook to fetch a single trip (for trip/day/places pages)
export function useTrip(id: string) {
  return useQuery({
    queryKey: tripKeys.detail(id),
    queryFn: () => getTrip(id),
    enabled: !!id,
  })
}

// Hook to create a new trip
export function useCreateTrip() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      name: string
      startDate: string
      endDate: string
      coverImage?: string
      color?: string
    }) => createTrip(data),
    onSuccess: (newTrip) => {
      // Invalidate the trips list to refetch
      queryClient.invalidateQueries({ queryKey: tripKeys.lists() })
    },
  })
}

// Hook to update a trip
export function useUpdateTrip() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Trip> }) =>
      updateTrip(id, data),
    onSuccess: (updatedTrip, { id }) => {
      // Update the specific trip in cache
      if (updatedTrip) {
        queryClient.setQueryData(tripKeys.detail(id), updatedTrip)
      }
      // Also invalidate the list to keep it in sync
      queryClient.invalidateQueries({ queryKey: tripKeys.lists() })
    },
  })
}

// Hook to delete a trip
export function useDeleteTrip() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteTrip(id),
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: tripKeys.detail(id) })
      // Invalidate the list
      queryClient.invalidateQueries({ queryKey: tripKeys.lists() })
    },
  })
}

// Hook to invalidate a trip's cache (for use after mutations like adding locations)
export function useInvalidateTrip() {
  const queryClient = useQueryClient()

  return (id: string) => {
    queryClient.invalidateQueries({ queryKey: tripKeys.detail(id) })
  }
}

// Hook to refetch a trip (useful after mutations)
export function useRefreshTrip(id: string) {
  const queryClient = useQueryClient()

  return async () => {
    await queryClient.invalidateQueries({ queryKey: tripKeys.detail(id) })
  }
}
