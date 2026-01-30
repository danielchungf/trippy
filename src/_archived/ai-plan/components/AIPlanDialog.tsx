"use client"

import { useState } from "react"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Trip } from "@/types"
import { AIDestination, AIPlanPreferences, AIPlanResponse } from "@/types/ai"
import { AIDateSelector } from "./AIDateSelector"
import { AIDestinationInput } from "./AIDestinationInput"
import { AIPreferencesForm } from "./AIPreferencesForm"
import { AIItineraryPreview } from "./AIItineraryPreview"
import { useGenerateAIPlan, useApplyAIPlan } from "@/lib/hooks/use-ai-plan"

type WizardStep = 'dates' | 'destinations' | 'preferences' | 'preview'

interface AIPlanDialogProps {
  trip: Trip
  onComplete: () => Promise<void>
}

export function AIPlanDialog({ trip, onComplete }: AIPlanDialogProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<WizardStep>('dates')

  // Wizard state
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [destinations, setDestinations] = useState<AIDestination[]>([])
  const [preferences, setPreferences] = useState<AIPlanPreferences>({
    travelStyle: 'moderate',
    interests: [],
  })
  const [generatedPlan, setGeneratedPlan] = useState<AIPlanResponse | null>(null)

  // Mutations
  const generateMutation = useGenerateAIPlan()
  const applyMutation = useApplyAIPlan(trip.id)

  const resetWizard = () => {
    setStep('dates')
    setSelectedDates([])
    setDestinations([])
    setPreferences({ travelStyle: 'moderate', interests: [] })
    setGeneratedPlan(null)
    generateMutation.reset()
    applyMutation.reset()
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      resetWizard()
    }
  }

  const handleGenerate = async () => {
    setStep('preview')
    try {
      const plan = await generateMutation.mutateAsync({
        tripId: trip.id,
        selectedDates,
        destinations,
        preferences,
      })
      setGeneratedPlan(plan)
    } catch (error) {
      console.error('Failed to generate plan:', error)
    }
  }

  const handleApply = async () => {
    if (!generatedPlan) return

    try {
      await applyMutation.mutateAsync({
        plan: generatedPlan,
        selectedDates,
      })
      await onComplete()
      setOpen(false)
      resetWizard()
    } catch (error) {
      console.error('Failed to apply plan:', error)
    }
  }

  const handleRegenerate = () => {
    setGeneratedPlan(null)
    generateMutation.reset()
    handleGenerate()
  }

  const canProceedFromDates = selectedDates.length > 0
  const canProceedFromDestinations = destinations.length > 0
  const canProceedFromPreferences = preferences.interests.length > 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="small" leftIcon={<Sparkles />}>
          AI Plan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 'dates' && 'Select Days to Plan'}
            {step === 'destinations' && 'Where do you want to go?'}
            {step === 'preferences' && 'Your Preferences'}
            {step === 'preview' && 'Your Itinerary'}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {step === 'dates' && (
            <AIDateSelector
              trip={trip}
              selectedDates={selectedDates}
              onChange={setSelectedDates}
            />
          )}

          {step === 'destinations' && (
            <AIDestinationInput
              destinations={destinations}
              onChange={setDestinations}
            />
          )}

          {step === 'preferences' && (
            <AIPreferencesForm
              preferences={preferences}
              onChange={setPreferences}
            />
          )}

          {step === 'preview' && (
            <AIItineraryPreview
              plan={generatedPlan}
              isLoading={generateMutation.isPending}
              error={generateMutation.error?.message}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          {step !== 'dates' && step !== 'preview' && (
            <Button
              variant="outline"
              onClick={() => {
                if (step === 'destinations') setStep('dates')
                if (step === 'preferences') setStep('destinations')
              }}
            >
              Back
            </Button>
          )}
          {step === 'dates' && <div />}

          {step === 'dates' && (
            <Button
              onClick={() => setStep('destinations')}
              disabled={!canProceedFromDates}
            >
              Next
            </Button>
          )}

          {step === 'destinations' && (
            <Button
              onClick={() => setStep('preferences')}
              disabled={!canProceedFromDestinations}
            >
              Next
            </Button>
          )}

          {step === 'preferences' && (
            <Button
              onClick={handleGenerate}
              disabled={!canProceedFromPreferences}
            >
              Generate Itinerary
            </Button>
          )}

          {step === 'preview' && (
            <div className="flex gap-2 ml-auto">
              {generatedPlan && !applyMutation.isPending && (
                <>
                  <Button variant="outline" onClick={handleRegenerate}>
                    Regenerate
                  </Button>
                  <Button onClick={handleApply}>
                    Apply Itinerary
                  </Button>
                </>
              )}
              {applyMutation.isPending && (
                <Button disabled>Applying...</Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
