import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AIPlanRequest, AIPlanResponse } from '@/types/ai'
import { applyAIPlan } from '@/lib/ai/apply-plan'
import { tripKeys } from './use-trips'

async function generatePlan(request: AIPlanRequest): Promise<AIPlanResponse> {
  const response = await fetch('/api/ai/plan-trip', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to generate plan')
  }

  return response.json()
}

export function useGenerateAIPlan() {
  return useMutation({
    mutationFn: generatePlan,
  })
}

export function useApplyAIPlan(tripId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      plan,
      selectedDates,
    }: {
      plan: AIPlanResponse
      selectedDates: string[]
    }) => {
      const success = await applyAIPlan(tripId, plan, selectedDates)
      if (!success) {
        throw new Error('Failed to apply plan')
      }
      return success
    },
    onSuccess: () => {
      // Invalidate trip cache to refresh data
      queryClient.invalidateQueries({ queryKey: tripKeys.detail(tripId) })
    },
  })
}
