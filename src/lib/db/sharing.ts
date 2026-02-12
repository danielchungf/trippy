import { createClient } from '@/lib/supabase/client'
import { TripMember, TripMemberRole, TripMemberStatus } from '@/types'

interface TripMemberRow {
  id: string
  trip_id: string
  user_id: string | null
  role: string
  invited_by: string
  invited_email: string | null
  status: string
  created_at: string
}

function rowToTripMember(row: TripMemberRow): TripMember {
  return {
    id: row.id,
    tripId: row.trip_id,
    userId: row.user_id || undefined,
    role: row.role as TripMemberRole,
    invitedBy: row.invited_by,
    invitedEmail: row.invited_email || undefined,
    status: row.status as TripMemberStatus,
    createdAt: row.created_at,
    email: row.invited_email || undefined,
  }
}

// Get all members for a trip
export async function getTripMembers(tripId: string): Promise<TripMember[]> {
  const supabase = createClient()

  const { data: members, error } = await supabase
    .from('trip_members')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true })

  if (error || !members) {
    console.error('Error fetching trip members:', JSON.stringify(error), 'data:', members)
    return []
  }

  return members.map(row => rowToTripMember(row))
}

// Invite a user by email. If userId is provided (from search results),
// the invite is immediately accepted so the user sees the trip right away.
export async function inviteMember(tripId: string, email: string, userId?: string): Promise<TripMember | null> {
  const supabase = createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return null
  const user = session.user

  // Normalize email
  const normalizedEmail = email.toLowerCase().trim()

  // Check if this email is already a member or has a pending invite
  const { data: existingMember } = await supabase
    .from('trip_members')
    .select('*')
    .eq('trip_id', tripId)
    .eq('invited_email', normalizedEmail)
    .single()

  if (existingMember) {
    // If already accepted, they're already an editor
    if (existingMember.status === 'accepted') {
      console.log('User is already an accepted editor')
      return null
    }

    // If pending, re-activate: set user_id if we know it and mark accepted
    if (existingMember.status === 'pending' && userId) {
      const { data: updated, error: updateError } = await supabase
        .from('trip_members')
        .update({ user_id: userId, status: 'accepted' })
        .eq('id', existingMember.id)
        .select()
        .single()

      if (updateError || !updated) {
        console.error('Error re-activating pending invite:', updateError)
        return null
      }

      return rowToTripMember(updated)
    }

    // Pending but no userId - return existing record so UI can show it
    return rowToTripMember(existingMember)
  }

  // Create new invite
  const isKnownUser = !!userId
  const { data: member, error } = await supabase
    .from('trip_members')
    .insert({
      trip_id: tripId,
      user_id: isKnownUser ? userId : null,
      role: 'editor',
      invited_by: user.id,
      invited_email: normalizedEmail,
      status: isKnownUser ? 'accepted' : 'pending',
    })
    .select()
    .single()

  if (error || !member) {
    console.error('Error inviting member:', error)
    return null
  }

  return rowToTripMember(member)
}

// Remove a member from a trip
export async function removeMember(tripId: string, memberId: string): Promise<boolean> {
  const supabase = createClient()

  const { error } = await supabase
    .from('trip_members')
    .delete()
    .eq('id', memberId)
    .eq('trip_id', tripId)
    .neq('role', 'owner') // Cannot remove owner

  if (error) {
    console.error('Error removing member:', error)
    return false
  }

  return true
}

// Accept pending invites for the current user (called on login/signup)
export async function acceptPendingInvites(): Promise<number> {
  const supabase = createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user?.email) {
    console.log('acceptPendingInvites: No user email found')
    return 0
  }
  const user = session.user

  const normalizedEmail = user.email!.toLowerCase().trim()
  console.log('acceptPendingInvites: Looking for invites for', normalizedEmail)

  // First, check if there are any pending invites for this email
  const { data: pendingInvites, error: fetchError } = await supabase
    .from('trip_members')
    .select('*')
    .eq('invited_email', normalizedEmail)
    .eq('status', 'pending')

  console.log('acceptPendingInvites: Found pending invites:', pendingInvites, 'Error:', fetchError)

  if (!pendingInvites || pendingInvites.length === 0) {
    console.log('acceptPendingInvites: No pending invites found')
    return 0
  }

  // Update each invite to accepted (keep invited_email for display purposes)
  const { data, error } = await supabase
    .from('trip_members')
    .update({
      user_id: user.id,
      status: 'accepted'
    })
    .eq('invited_email', normalizedEmail)
    .eq('status', 'pending')
    .select()

  if (error) {
    console.error('Error accepting invites:', error)
    return 0
  }

  console.log('acceptPendingInvites: Successfully accepted invites:', data)
  return data?.length || 0
}

// Search for users by name or email
export interface UserSearchResult {
  id: string
  email: string
  name: string | null
}

export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  if (!query || query.length < 2) return []

  const supabase = createClient()

  const { data, error } = await supabase
    .rpc('search_users', { search_query: query })

  if (error) {
    console.error('Error searching users:', error)
    return []
  }

  return data || []
}

// Check if current user is the owner of a trip
export async function isOwnerOfTrip(tripId: string): Promise<boolean> {
  const supabase = createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return false
  const user = session.user

  const { data: trip } = await supabase
    .from('trips')
    .select('owner_id')
    .eq('id', tripId)
    .single()

  return trip?.owner_id === user.id
}
