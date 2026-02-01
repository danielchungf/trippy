"use client"

import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { acceptPendingInvites } from "@/lib/db"
import { tripKeys } from "./use-trips"
import { toast } from "sonner"

/**
 * Hook that subscribes to real-time trip_members changes for the current user.
 * When a new invite is received, it auto-accepts and shows a toast notification.
 */
export function useRealtimeInvites(userEmail: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userEmail) return

    const supabase = createClient()
    const normalizedEmail = userEmail.toLowerCase().trim()

    const channel = supabase
      .channel("user-invites")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trip_members",
          filter: `invited_email=eq.${normalizedEmail}`,
        },
        async () => {
          // Auto-accept the new invite
          const acceptedCount = await acceptPendingInvites()
          if (acceptedCount > 0) {
            // Refresh the trips list to include the new shared trip
            queryClient.invalidateQueries({ queryKey: tripKeys.lists() })
            // Notify the user
            toast.success("You were added to a shared trip!")
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userEmail, queryClient])
}
