import { PlaceCategory, Location } from '@/types'

// Parsed place from Google Maps CSV
export interface ParsedCSVPlace {
  name: string
  note: string
  url: string
  tags: string[]
}

// Place with resolved data ready for import
export interface ResolvedPlace extends ParsedCSVPlace {
  category: PlaceCategory
  locationId?: string
}

/**
 * Parse Google Maps CSV export content
 * Expected columns: Title, Note, URL, Tags, Comment
 */
export function parseGoogleMapsCSV(csvContent: string): ParsedCSVPlace[] {
  const lines = csvContent.split('\n')
  if (lines.length < 2) return []

  // Parse header to find column indices
  const header = parseCSVLine(lines[0])
  const titleIdx = header.findIndex(h => h.toLowerCase() === 'title')
  const noteIdx = header.findIndex(h => h.toLowerCase() === 'note')
  const urlIdx = header.findIndex(h => h.toLowerCase() === 'url')
  const tagsIdx = header.findIndex(h => h.toLowerCase() === 'tags')
  const commentIdx = header.findIndex(h => h.toLowerCase() === 'comment')

  if (titleIdx === -1 || urlIdx === -1) {
    throw new Error('Invalid CSV format: missing Title or URL columns')
  }

  const places: ParsedCSVPlace[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const columns = parseCSVLine(line)
    const name = columns[titleIdx]?.trim() || ''
    const url = columns[urlIdx]?.trim() || ''

    // Skip empty rows
    if (!name || !url) continue

    // Combine Note and Comment fields
    const note = columns[noteIdx]?.trim() || ''
    const comment = columns[commentIdx]?.trim() || ''
    const combinedNote = [note, comment].filter(Boolean).join(' - ')

    // Parse tags (comma-separated)
    const tagsStr = columns[tagsIdx]?.trim() || ''
    const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : []

    places.push({
      name,
      note: combinedNote,
      url,
      tags,
    })
  }

  return places
}

/**
 * Parse a single CSV line, handling quoted fields with commas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"'
        i++
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }

  result.push(current)
  return result
}

/**
 * Detect category from Google Maps tags
 * Returns null if no category can be detected
 */
export function detectCategoryFromTags(tags: string[]): PlaceCategory | null {
  const tagStr = tags.join(' ').toLowerCase()

  // Food related
  if (tagStr.includes('food') || tagStr.includes('restaurant') || tagStr.includes('dining')) {
    return 'food'
  }

  // Coffee/Cafe
  if (tagStr.includes('coffee') || tagStr.includes('cafe') || tagStr.includes('café')) {
    return 'coffee'
  }

  // Shopping
  if (tagStr.includes('shopping') || tagStr.includes('shop') || tagStr.includes('store')) {
    return 'shopping'
  }

  // Sights/Landmarks
  if (tagStr.includes('sight') || tagStr.includes('landmark') || tagStr.includes('attraction')) {
    return 'sights'
  }

  // Museums
  if (tagStr.includes('museum') || tagStr.includes('gallery') || tagStr.includes('art')) {
    return 'museums'
  }

  // Nature
  if (tagStr.includes('nature') || tagStr.includes('park') || tagStr.includes('garden') || tagStr.includes('beach')) {
    return 'nature'
  }

  // Nightlife
  if (tagStr.includes('nightlife') || tagStr.includes('bar') || tagStr.includes('club')) {
    return 'nightlife'
  }

  // Entertainment
  if (tagStr.includes('entertainment') || tagStr.includes('theater') || tagStr.includes('cinema')) {
    return 'entertainment'
  }

  // Wellness
  if (tagStr.includes('wellness') || tagStr.includes('spa') || tagStr.includes('gym')) {
    return 'wellness'
  }

  return null
}

/**
 * Match a place's address to a trip location
 * Returns the locationId if a match is found
 */
export function matchLocationByAddress(address: string, locations: Location[]): string | undefined {
  if (!address || locations.length === 0) return undefined

  const addressLower = address.toLowerCase()

  for (const location of locations) {
    const locationName = location.name.toLowerCase()

    // Check if address contains the location name
    if (addressLower.includes(locationName)) {
      return location.id
    }

    // Also check common variations (e.g., "Tokyo" might appear as "Tōkyō")
    // Remove diacritics for comparison
    const normalizedAddress = removeDiacritics(addressLower)
    const normalizedLocation = removeDiacritics(locationName)

    if (normalizedAddress.includes(normalizedLocation)) {
      return location.id
    }
  }

  return undefined
}

/**
 * Remove diacritics from a string for fuzzy matching
 */
function removeDiacritics(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/**
 * Detect category from place name (fallback when tags are empty)
 * Returns null if no category can be detected
 */
export function detectCategoryFromName(name: string): PlaceCategory | null {
  const nameLower = name.toLowerCase()

  // Coffee shops
  if (nameLower.includes('coffee') || nameLower.includes('café') || nameLower.includes('cafe') ||
      nameLower.includes('roaster') || nameLower.includes('espresso')) {
    return 'coffee'
  }

  // Restaurants/Food
  if (nameLower.includes('restaurant') || nameLower.includes('ramen') || nameLower.includes('sushi') ||
      nameLower.includes('gyukatsu') || nameLower.includes('udon') || nameLower.includes('tempura') ||
      nameLower.includes('izakaya') || nameLower.includes('bakery') || nameLower.includes('curry')) {
    return 'food'
  }

  // Museums
  if (nameLower.includes('museum') || nameLower.includes('gallery')) {
    return 'museums'
  }

  // Shopping
  if (nameLower.includes('store') || nameLower.includes('shop') || nameLower.includes('market') ||
      nameLower.includes('mall') || nameLower.includes('plaza')) {
    return 'shopping'
  }

  // Nature/Parks
  if (nameLower.includes('park') || nameLower.includes('garden') || nameLower.includes('temple') ||
      nameLower.includes('shrine') || nameLower.includes('castle')) {
    return 'nature'
  }

  // Sights
  if (nameLower.includes('tower') || nameLower.includes('observatory') || nameLower.includes('building')) {
    return 'sights'
  }

  return null
}
