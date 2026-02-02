# Piper

## Vision
Piper is your ultimate travel companion. The only app you need to build a complete trip plan - full itineraries, accommodation details, and all the places you want to visit, powered by Google Maps.

Built for travelers who love to plan. People who want to organize every activity, save every restaurant and landmark, and arrive at their destination fully prepared.

## Two Phases of Use

### 1. Planning Phase (Before the Trip)
Users build their complete trip at home:
- Create the trip with dates and destinations
- Add accommodations with check-in/out details
- Plan each day with activities (times, durations, notes)
- Save places to visit (restaurants, sights, museums, etc.)
- Organize everything into a detailed itinerary

### 2. Travel Phase (During the Trip)
Users open Piper on mobile while traveling:
- See today's activities at a glance
- View routes between locations
- Check saved places nearby
- Stay prepared for each day

## Core Features
- **Trips** - Container for a journey with dates, cover image, destinations
- **Days** - Daily itinerary generated from trip dates
- **Activities** - Planned events with time, duration, place, notes
- **Saved Places** - Places to visit (food, coffee, sights, museums, nature, etc.)
- **Accommodations** - Where you're staying with check-in/out, costs, booking links
- **Packing List** - Track what to bring

## Tech Stack
- **Framework:** Next.js 16.1.4 (App Router)
- **Database:** Supabase (PostgreSQL + Auth + RLS)
- **State:** TanStack React Query (5-min stale, 30-min gc)
- **UI:** Tailwind CSS + Radix UI components
- **Maps:** Google Maps JavaScript API
- **Fonts:** Fustat (headings), Inter (body)

## Design System
See `src/lib/design-tokens.ts` for:
- Typography classes (h1-h4, body, bodySm, label)
- Color tokens (primary, secondary, accent #FF591E)
- Icon sizing patterns (16px/20px with stroke weights)

## Key Directories
- `src/app/` - Next.js App Router pages
- `src/components/` - React components
- `src/lib/db/` - Supabase database operations
- `src/types/` - TypeScript type definitions
- `src/_archived/` - Disabled features (AI plan system)

## Memory
Task context and learnings are stored in `/memory`:
- `/memory/decisions/` - Architecture decisions
- `/memory/corrections/` - Mistakes to avoid
- `/memory/tasks/` - Per-task notes

After making corrections, update this file or add to `/memory/corrections/`.

## Rules & Corrections

- **Google Places photo URLs expire** - Never store/use photo URLs from the database. Always fetch fresh photos using `googlePlaceId` via `PlacePhoto` component. URLs return 403 after ~24 hours. (See `src/components/PlacePhoto.tsx`)
