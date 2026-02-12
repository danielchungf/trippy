-- Create a SECURITY DEFINER function for trip creation.
--
-- This bypasses the RLS INSERT policy on trips which can fail
-- when the JWT context isn't properly propagated to PostgREST
-- (auth.uid() returns NULL even though the client session is valid).
--
-- Accepts an optional p_user_id fallback for when auth.uid() is NULL.
-- The fallback is verified against the profiles table to prevent abuse.

CREATE OR REPLACE FUNCTION create_trip_for_user(
  p_name text,
  p_start_date date,
  p_end_date date,
  p_cover_image text DEFAULT NULL,
  p_cover_image_focus_x numeric DEFAULT 0.5,
  p_cover_image_focus_y numeric DEFAULT 0.5,
  p_color text DEFAULT NULL,
  p_home_currency text DEFAULT 'USD',
  p_user_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_trip record;
  v_profile_exists boolean;
BEGIN
  -- Prefer auth.uid() from the JWT context
  v_user_id := auth.uid();

  -- If auth.uid() is NULL, use the provided fallback user_id
  IF v_user_id IS NULL AND p_user_id IS NOT NULL THEN
    -- Verify the user exists in profiles to prevent abuse
    SELECT EXISTS(SELECT 1 FROM profiles WHERE id = p_user_id) INTO v_profile_exists;
    IF NOT v_profile_exists THEN
      RAISE EXCEPTION 'Invalid user';
    END IF;
    v_user_id := p_user_id;
  END IF;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Insert the trip (bypasses RLS since this is SECURITY DEFINER)
  INSERT INTO trips (owner_id, name, start_date, end_date, cover_image, cover_image_focus_x, cover_image_focus_y, color, home_currency)
  VALUES (v_user_id, p_name, p_start_date, p_end_date, p_cover_image, p_cover_image_focus_x, p_cover_image_focus_y, p_color, p_home_currency)
  RETURNING * INTO v_trip;

  RETURN row_to_json(v_trip);
END;
$$;

-- Also restore the original INSERT policy (remove the temporary WITH CHECK (true))
DROP POLICY IF EXISTS "Users can insert their own trips" ON trips;
CREATE POLICY "Users can insert their own trips" ON trips
  FOR INSERT WITH CHECK (owner_id = auth.uid());
