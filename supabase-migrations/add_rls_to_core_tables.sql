-- Add Row Level Security to all core tables
-- Previously only expenses, packing_items, and trip_exchange_rates had RLS.
-- The trips, locations, accommodations, days, activities, saved_places, and
-- trip_members tables were unprotected, allowing any authenticated user to
-- read/write any row via the Supabase client.
--
-- Uses DROP POLICY IF EXISTS before each CREATE to be idempotent.

--------------------------------------------------------------------------------
-- TRIPS
--------------------------------------------------------------------------------

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own or shared trips" ON trips;
CREATE POLICY "Users can view their own or shared trips" ON trips
  FOR SELECT USING (
    owner_id = auth.uid()
    OR id IN (
      SELECT trip_id FROM trip_members
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

DROP POLICY IF EXISTS "Users can insert their own trips" ON trips;
CREATE POLICY "Users can insert their own trips" ON trips
  FOR INSERT WITH CHECK (
    owner_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can update their own or shared trips" ON trips;
CREATE POLICY "Users can update their own or shared trips" ON trips
  FOR UPDATE USING (
    owner_id = auth.uid()
    OR id IN (
      SELECT trip_id FROM trip_members
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

DROP POLICY IF EXISTS "Only owners can delete trips" ON trips;
CREATE POLICY "Only owners can delete trips" ON trips
  FOR DELETE USING (
    owner_id = auth.uid()
  );

--------------------------------------------------------------------------------
-- LOCATIONS
--------------------------------------------------------------------------------

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view locations for accessible trips" ON locations;
DROP POLICY IF EXISTS "Users can view locations" ON locations;
CREATE POLICY "Users can view locations for accessible trips" ON locations
  FOR SELECT USING (
    trip_id IN (
      SELECT id FROM trips WHERE owner_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

DROP POLICY IF EXISTS "Users can insert locations" ON locations;
CREATE POLICY "Users can insert locations" ON locations
  FOR INSERT WITH CHECK (
    trip_id IN (
      SELECT id FROM trips WHERE owner_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

DROP POLICY IF EXISTS "Users can update locations" ON locations;
CREATE POLICY "Users can update locations" ON locations
  FOR UPDATE USING (
    trip_id IN (
      SELECT id FROM trips WHERE owner_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

DROP POLICY IF EXISTS "Users can delete locations" ON locations;
CREATE POLICY "Users can delete locations" ON locations
  FOR DELETE USING (
    trip_id IN (
      SELECT id FROM trips WHERE owner_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

--------------------------------------------------------------------------------
-- ACCOMMODATIONS
--------------------------------------------------------------------------------

ALTER TABLE accommodations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view accommodations for accessible trips" ON accommodations;
DROP POLICY IF EXISTS "Users can view accommodations" ON accommodations;
CREATE POLICY "Users can view accommodations for accessible trips" ON accommodations
  FOR SELECT USING (
    trip_id IN (
      SELECT id FROM trips WHERE owner_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

DROP POLICY IF EXISTS "Users can insert accommodations" ON accommodations;
CREATE POLICY "Users can insert accommodations" ON accommodations
  FOR INSERT WITH CHECK (
    trip_id IN (
      SELECT id FROM trips WHERE owner_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

DROP POLICY IF EXISTS "Users can update accommodations" ON accommodations;
CREATE POLICY "Users can update accommodations" ON accommodations
  FOR UPDATE USING (
    trip_id IN (
      SELECT id FROM trips WHERE owner_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

DROP POLICY IF EXISTS "Users can delete accommodations" ON accommodations;
CREATE POLICY "Users can delete accommodations" ON accommodations
  FOR DELETE USING (
    trip_id IN (
      SELECT id FROM trips WHERE owner_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

--------------------------------------------------------------------------------
-- DAYS
--------------------------------------------------------------------------------

ALTER TABLE days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view days for accessible trips" ON days;
DROP POLICY IF EXISTS "Users can view days" ON days;
CREATE POLICY "Users can view days for accessible trips" ON days
  FOR SELECT USING (
    trip_id IN (
      SELECT id FROM trips WHERE owner_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

DROP POLICY IF EXISTS "Users can insert days" ON days;
CREATE POLICY "Users can insert days" ON days
  FOR INSERT WITH CHECK (
    trip_id IN (
      SELECT id FROM trips WHERE owner_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

DROP POLICY IF EXISTS "Users can update days" ON days;
CREATE POLICY "Users can update days" ON days
  FOR UPDATE USING (
    trip_id IN (
      SELECT id FROM trips WHERE owner_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

DROP POLICY IF EXISTS "Users can delete days" ON days;
CREATE POLICY "Users can delete days" ON days
  FOR DELETE USING (
    trip_id IN (
      SELECT id FROM trips WHERE owner_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

--------------------------------------------------------------------------------
-- ACTIVITIES
--------------------------------------------------------------------------------

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view activities for accessible trips" ON activities;
DROP POLICY IF EXISTS "Users can view activities" ON activities;
CREATE POLICY "Users can view activities for accessible trips" ON activities
  FOR SELECT USING (
    day_id IN (
      SELECT d.id FROM days d
      WHERE d.trip_id IN (
        SELECT id FROM trips WHERE owner_id = auth.uid()
        UNION
        SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND status = 'accepted'
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert activities" ON activities;
CREATE POLICY "Users can insert activities" ON activities
  FOR INSERT WITH CHECK (
    day_id IN (
      SELECT d.id FROM days d
      WHERE d.trip_id IN (
        SELECT id FROM trips WHERE owner_id = auth.uid()
        UNION
        SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND status = 'accepted'
      )
    )
  );

DROP POLICY IF EXISTS "Users can update activities" ON activities;
CREATE POLICY "Users can update activities" ON activities
  FOR UPDATE USING (
    day_id IN (
      SELECT d.id FROM days d
      WHERE d.trip_id IN (
        SELECT id FROM trips WHERE owner_id = auth.uid()
        UNION
        SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND status = 'accepted'
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete activities" ON activities;
CREATE POLICY "Users can delete activities" ON activities
  FOR DELETE USING (
    day_id IN (
      SELECT d.id FROM days d
      WHERE d.trip_id IN (
        SELECT id FROM trips WHERE owner_id = auth.uid()
        UNION
        SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND status = 'accepted'
      )
    )
  );

--------------------------------------------------------------------------------
-- SAVED PLACES
--------------------------------------------------------------------------------

ALTER TABLE saved_places ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view saved places for accessible trips" ON saved_places;
DROP POLICY IF EXISTS "Users can view saved places" ON saved_places;
CREATE POLICY "Users can view saved places for accessible trips" ON saved_places
  FOR SELECT USING (
    trip_id IN (
      SELECT id FROM trips WHERE owner_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

DROP POLICY IF EXISTS "Users can insert saved places" ON saved_places;
CREATE POLICY "Users can insert saved places" ON saved_places
  FOR INSERT WITH CHECK (
    trip_id IN (
      SELECT id FROM trips WHERE owner_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

DROP POLICY IF EXISTS "Users can update saved places" ON saved_places;
CREATE POLICY "Users can update saved places" ON saved_places
  FOR UPDATE USING (
    trip_id IN (
      SELECT id FROM trips WHERE owner_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

DROP POLICY IF EXISTS "Users can delete saved places" ON saved_places;
CREATE POLICY "Users can delete saved places" ON saved_places
  FOR DELETE USING (
    trip_id IN (
      SELECT id FROM trips WHERE owner_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

--------------------------------------------------------------------------------
-- TRIP MEMBERS
--------------------------------------------------------------------------------

ALTER TABLE trip_members ENABLE ROW LEVEL SECURITY;

-- Users can see members of trips they have access to
DROP POLICY IF EXISTS "Users can view members of accessible trips" ON trip_members;
CREATE POLICY "Users can view members of accessible trips" ON trip_members
  FOR SELECT USING (
    trip_id IN (
      SELECT id FROM trips WHERE owner_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND status = 'accepted'
    )
    -- Also allow users to see their own pending invites (for acceptPendingInvites)
    OR (invited_email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND status = 'pending')
  );

-- Only trip owners can invite members
DROP POLICY IF EXISTS "Trip owners can insert members" ON trip_members;
CREATE POLICY "Trip owners can insert members" ON trip_members
  FOR INSERT WITH CHECK (
    trip_id IN (
      SELECT id FROM trips WHERE owner_id = auth.uid()
    )
  );

-- Allow users to accept their own invites (update user_id and status)
-- Also allow trip owners to manage members
DROP POLICY IF EXISTS "Users can update their own invites or manage as owner" ON trip_members;
CREATE POLICY "Users can update their own invites or manage as owner" ON trip_members
  FOR UPDATE USING (
    -- User accepting their own invite
    (invited_email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND status = 'pending')
    -- Or trip owner managing members
    OR trip_id IN (
      SELECT id FROM trips WHERE owner_id = auth.uid()
    )
  );

-- Only trip owners can remove members
DROP POLICY IF EXISTS "Trip owners can delete members" ON trip_members;
CREATE POLICY "Trip owners can delete members" ON trip_members
  FOR DELETE USING (
    trip_id IN (
      SELECT id FROM trips WHERE owner_id = auth.uid()
    )
  );
