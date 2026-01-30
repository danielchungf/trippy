# AI Trip Planning Feature (Archived)

This feature uses Claude AI to generate trip itineraries based on user preferences.

## How to Re-enable

1. Move files back to their original locations:
   - `components/` → `src/components/ai/`
   - `lib/` → `src/lib/ai/`
   - `api/` → `src/app/api/ai/`
   - `types.ts` → `src/types/ai.ts`
   - `use-ai-plan.ts` → `src/lib/hooks/use-ai-plan.ts`

2. Add import to `src/app/trip/[id]/page.tsx`:
   ```tsx
   import { AIPlanDialog } from "@/components/ai/AIPlanDialog"
   ```

3. Add button to TripHeader (in the buttons div):
   ```tsx
   <AIPlanDialog trip={trip} onComplete={onRefresh} />
   ```

4. Ensure `ANTHROPIC_API_KEY` is set in `.env.local`

## Features

- Multi-step wizard: select dates → add destinations → set preferences → generate
- Uses Claude to generate day-by-day itineraries with activities
- Enriches places with Google Maps API for real coordinates
- Replaces existing activities for selected dates

## Files

- `components/` - UI components (dialog, date selector, destination input, preferences form, preview)
- `lib/` - Utilities (validation, apply plan, place enrichment)
- `api/` - Next.js API route for Claude
- `types.ts` - TypeScript interfaces
- `use-ai-plan.ts` - React Query hooks
