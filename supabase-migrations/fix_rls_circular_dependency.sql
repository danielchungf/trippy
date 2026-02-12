-- Fix RLS circular dependency between trips and trip_members tables.
--
-- The previous migration created a cycle:
--   trips SELECT policy → subqueries trip_members
--   trip_members SELECT policy → subqueries trips
-- This causes PostgreSQL to hit infinite recursion → 500 errors.
--
-- Fix: Create a SECURITY DEFINER function that bypasses RLS to get
-- accessible trip IDs, then use it in all policies.

--------------------------------------------------------------------------------
-- HELPER FUNCTION (bypasses RLS to break circular dependency)
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_accessible_trip_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM trips WHERE owner_id = auth.uid()
  UNION
  SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND status = 'accepted'
$$;

--------------------------------------------------------------------------------
-- TRIPS (recreate policies using the helper function)
--------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view their own or shared trips" ON trips;
CREATE POLICY "Users can view their own or shared trips" ON trips
  FOR SELECT USING (
    id IN (SELECT get_accessible_trip_ids())
  );

DROP POLICY IF EXISTS "Users can insert their own trips" ON trips;
CREATE POLICY "Users can insert their own trips" ON trips
  FOR INSERT WITH CHECK (
    owner_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can update their own or shared trips" ON trips;
CREATE POLICY "Users can update their own or shared trips" ON trips
  FOR UPDATE USING (
    id IN (SELECT get_accessible_trip_ids())
  );

DROP POLICY IF EXISTS "Only owners can delete trips" ON trips;
CREATE POLICY "Only owners can delete trips" ON trips
  FOR DELETE USING (
    owner_id = auth.uid()
  );

--------------------------------------------------------------------------------
-- TRIP MEMBERS (recreate policies using the helper function)
--------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view members of accessible trips" ON trip_members;
CREATE POLICY "Users can view members of accessible trips" ON trip_members
  FOR SELECT USING (
    trip_id IN (SELECT get_accessible_trip_ids())
    OR (invited_email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND status = 'pending')
  );

DROP POLICY IF EXISTS "Trip owners can insert members" ON trip_members;
CREATE POLICY "Trip owners can insert members" ON trip_members
  FOR INSERT WITH CHECK (
    trip_id IN (SELECT id FROM trips WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their own invites or manage as owner" ON trip_members;
CREATE POLICY "Users can update their own invites or manage as owner" ON trip_members
  FOR UPDATE USING (
    (invited_email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND status = 'pending')
    OR trip_id IN (SELECT id FROM trips WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Trip owners can delete members" ON trip_members;
CREATE POLICY "Trip owners can delete members" ON trip_members
  FOR DELETE USING (
    trip_id IN (SELECT id FROM trips WHERE owner_id = auth.uid())
  );

--------------------------------------------------------------------------------
-- LOCATIONS (recreate using helper function)
--------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view locations for accessible trips" ON locations;
CREATE POLICY "Users can view locations for accessible trips" ON locations
  FOR SELECT USING (trip_id IN (SELECT get_accessible_trip_ids()));

DROP POLICY IF EXISTS "Users can insert locations" ON locations;
CREATE POLICY "Users can insert locations" ON locations
  FOR INSERT WITH CHECK (trip_id IN (SELECT get_accessible_trip_ids()));

DROP POLICY IF EXISTS "Users can update locations" ON locations;
CREATE POLICY "Users can update locations" ON locations
  FOR UPDATE USING (trip_id IN (SELECT get_accessible_trip_ids()));

DROP POLICY IF EXISTS "Users can delete locations" ON locations;
CREATE POLICY "Users can delete locations" ON locations
  FOR DELETE USING (trip_id IN (SELECT get_accessible_trip_ids()));

--------------------------------------------------------------------------------
-- ACCOMMODATIONS (recreate using helper function)
--------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view accommodations for accessible trips" ON accommodations;
CREATE POLICY "Users can view accommodations for accessible trips" ON accommodations
  FOR SELECT USING (trip_id IN (SELECT get_accessible_trip_ids()));

DROP POLICY IF EXISTS "Users can insert accommodations" ON accommodations;
CREATE POLICY "Users can insert accommodations" ON accommodations
  FOR INSERT WITH CHECK (trip_id IN (SELECT get_accessible_trip_ids()));

DROP POLICY IF EXISTS "Users can update accommodations" ON accommodations;
CREATE POLICY "Users can update accommodations" ON accommodations
  FOR UPDATE USING (trip_id IN (SELECT get_accessible_trip_ids()));

DROP POLICY IF EXISTS "Users can delete accommodations" ON accommodations;
CREATE POLICY "Users can delete accommodations" ON accommodations
  FOR DELETE USING (trip_id IN (SELECT get_accessible_trip_ids()));

--------------------------------------------------------------------------------
-- DAYS (recreate using helper function)
--------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view days for accessible trips" ON days;
CREATE POLICY "Users can view days for accessible trips" ON days
  FOR SELECT USING (trip_id IN (SELECT get_accessible_trip_ids()));

DROP POLICY IF EXISTS "Users can insert days" ON days;
CREATE POLICY "Users can insert days" ON days
  FOR INSERT WITH CHECK (trip_id IN (SELECT get_accessible_trip_ids()));

DROP POLICY IF EXISTS "Users can update days" ON days;
CREATE POLICY "Users can update days" ON days
  FOR UPDATE USING (trip_id IN (SELECT get_accessible_trip_ids()));

DROP POLICY IF EXISTS "Users can delete days" ON days;
CREATE POLICY "Users can delete days" ON days
  FOR DELETE USING (trip_id IN (SELECT get_accessible_trip_ids()));

--------------------------------------------------------------------------------
-- ACTIVITIES (recreate using helper function via days)
--------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view activities for accessible trips" ON activities;
CREATE POLICY "Users can view activities for accessible trips" ON activities
  FOR SELECT USING (
    day_id IN (SELECT d.id FROM days d WHERE d.trip_id IN (SELECT get_accessible_trip_ids()))
  );

DROP POLICY IF EXISTS "Users can insert activities" ON activities;
CREATE POLICY "Users can insert activities" ON activities
  FOR INSERT WITH CHECK (
    day_id IN (SELECT d.id FROM days d WHERE d.trip_id IN (SELECT get_accessible_trip_ids()))
  );

DROP POLICY IF EXISTS "Users can update activities" ON activities;
CREATE POLICY "Users can update activities" ON activities
  FOR UPDATE USING (
    day_id IN (SELECT d.id FROM days d WHERE d.trip_id IN (SELECT get_accessible_trip_ids()))
  );

DROP POLICY IF EXISTS "Users can delete activities" ON activities;
CREATE POLICY "Users can delete activities" ON activities
  FOR DELETE USING (
    day_id IN (SELECT d.id FROM days d WHERE d.trip_id IN (SELECT get_accessible_trip_ids()))
  );

--------------------------------------------------------------------------------
-- SAVED PLACES (recreate using helper function)
--------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view saved places for accessible trips" ON saved_places;
CREATE POLICY "Users can view saved places for accessible trips" ON saved_places
  FOR SELECT USING (trip_id IN (SELECT get_accessible_trip_ids()));

DROP POLICY IF EXISTS "Users can insert saved places" ON saved_places;
CREATE POLICY "Users can insert saved places" ON saved_places
  FOR INSERT WITH CHECK (trip_id IN (SELECT get_accessible_trip_ids()));

DROP POLICY IF EXISTS "Users can update saved places" ON saved_places;
CREATE POLICY "Users can update saved places" ON saved_places
  FOR UPDATE USING (trip_id IN (SELECT get_accessible_trip_ids()));

DROP POLICY IF EXISTS "Users can delete saved places" ON saved_places;
CREATE POLICY "Users can delete saved places" ON saved_places
  FOR DELETE USING (trip_id IN (SELECT get_accessible_trip_ids()));
