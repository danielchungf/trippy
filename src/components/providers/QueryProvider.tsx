"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data is considered fresh for 5 minutes
            staleTime: 5 * 60 * 1000,
            // Cache data for 30 minutes
            gcTime: 30 * 60 * 1000,
            // Don't refetch on window focus by default
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  // Clear all cached data when auth state changes to prevent
  // stale data leaking between different user sessions
  useEffect(() => {
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        queryClient.clear()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [queryClient])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
