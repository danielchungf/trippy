import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { AIPlanRequest, AIPlanResponse } from '@/types/ai'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `You are an expert travel planner helping users create detailed trip itineraries.
You have extensive knowledge of destinations worldwide, including restaurants, attractions, neighborhoods, and local customs.

When generating itineraries:
- Consider logical geographic grouping to minimize travel time
- Balance activities throughout the day with appropriate rest periods
- Include a mix of activities based on user preferences
- Suggest realistic times for each activity (use 24-hour format like "09:00", "14:30")
- Account for typical opening hours of attractions
- Include local dining recommendations near planned activities
- For relaxed style: 2-3 activities per day
- For moderate style: 3-4 activities per day
- For packed style: 5-6 activities per day

IMPORTANT: Always respond with valid JSON matching the exact schema provided. No markdown, no explanation, just the JSON.`

function buildUserPrompt(request: AIPlanRequest): string {
  const numDays = request.selectedDates.length
  const destinations = request.destinations.map(d => d.name).join(', ')
  const interests = request.preferences.interests.join(', ')

  return `Create a detailed day-by-day itinerary for this trip:

TRIP DETAILS:
- Dates to plan: ${request.selectedDates.join(', ')} (${numDays} days)
- Destinations: ${destinations}
- Travel Style: ${request.preferences.travelStyle}
- Interests: ${interests}
${request.preferences.constraints ? `- Special Requirements: ${request.preferences.constraints}` : ''}

Generate an itinerary in this exact JSON format:
{
  "days": [
    {
      "date": "YYYY-MM-DD",
      "name": "Day theme (e.g., 'Historic Kyoto', 'Tokyo Food Tour')",
      "activities": [
        {
          "title": "Activity name",
          "time": "HH:MM",
          "duration": 60,
          "place": {
            "name": "Place name",
            "address": "Full address in the local format"
          },
          "notes": "Tips or details about this activity"
        }
      ]
    }
  ]
}

Requirements:
- Generate exactly one entry for each date: ${request.selectedDates.join(', ')}
- Use real place names that exist and can be found on Google Maps
- Duration should be in minutes (60 = 1 hour, 90 = 1.5 hours)
- Distribute destinations logically across the days
- Give each day a descriptive name that captures its theme`
}

export async function POST(request: Request) {
  try {
    // Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request
    const body: AIPlanRequest = await request.json()

    if (!body.selectedDates?.length || !body.destinations?.length) {
      return Response.json(
        { error: 'Missing required fields: selectedDates and destinations' },
        { status: 400 }
      )
    }

    // Call Claude
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildUserPrompt(body),
        },
      ],
    })

    // Extract text response
    const textContent = message.content.find(c => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return Response.json(
        { error: 'No response from AI' },
        { status: 500 }
      )
    }

    // Parse JSON response
    let plan: AIPlanResponse
    try {
      plan = JSON.parse(textContent.text)
    } catch {
      console.error('Failed to parse AI response:', textContent.text)
      return Response.json(
        { error: 'Invalid AI response format' },
        { status: 500 }
      )
    }

    return Response.json(plan)
  } catch (error) {
    console.error('AI plan error:', error)
    return Response.json(
      { error: 'Failed to generate itinerary' },
      { status: 500 }
    )
  }
}
