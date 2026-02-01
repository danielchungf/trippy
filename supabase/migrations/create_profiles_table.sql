-- Create profiles table for user search functionality
-- Run this in Supabase SQL Editor

-- 1. Create the profiles table (if not exists)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 4. Create policy - all authenticated users can read profiles
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- 5. Create policy - users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- 6. Create function to handle new user signup (replace if exists)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create trigger to auto-create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Backfill existing users (upsert to handle duplicates)
INSERT INTO public.profiles (id, email, name)
SELECT
  id,
  email,
  raw_user_meta_data->>'name'
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name;

-- 9. Create or replace search function
CREATE OR REPLACE FUNCTION search_users(search_query TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.email, p.name
  FROM public.profiles p
  WHERE
    p.name ILIKE '%' || search_query || '%'
    OR p.email ILIKE '%' || search_query || '%'
  ORDER BY
    CASE WHEN p.name ILIKE search_query || '%' THEN 0 ELSE 1 END,
    p.name
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
