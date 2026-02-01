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
    console.error('Error fetching trip members:', error)
    return []
  }

  return members.map(row => rowToTripMember(row))
}

// Invite a user by email
export async function inviteMember(tripId: string, email: string): Promise<TripMember | null> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Normalize email
  const normalizedEmail = email.toLowerCase().trim()

  // Check if this email is already a member or has a pending invite
  const { data: existingMember } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('invited_email', normalizedEmail)
    .single()

  if (existingMember) {
    console.error('User already invited')
    return null
  }

  // Check if a user with this email exists in auth.users
  // We need to search for existing user by checking trip_members with matching user
  // Since we can't directly query auth.users, we'll create a pending invite
  // and it will be converted when the user logs in

  const { data: member, error } = await supabase
    .from('trip_members')
    .insert({
      trip_id: tripId,
      user_id: null,
      role: 'editor',
      invited_by: user.id,
      invited_email: normalizedEmail,
      status: 'pending',
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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    console.log('acceptPendingInvites: No user email found')
    return 0
  }

  const normalizedEmail = user.email.toLowerCase().trim()
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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: trip } = await supabase
    .from('trips')
    .select('owner_id')
    .eq('id', tripId)
    .single()

  return trip?.owner_id === user.id
}
