-- Add selected_photo_index column to accommodations, saved_places, and locations tables
-- Run this in Supabase SQL Editor

-- Accommodations
ALTER TABLE public.accommodations
ADD COLUMN IF NOT EXISTS selected_photo_index INTEGER DEFAULT NULL;

-- Saved Places
ALTER TABLE public.saved_places
ADD COLUMN IF NOT EXISTS selected_photo_index INTEGER DEFAULT NULL;

-- Locations
ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS selected_photo_index INTEGER DEFAULT NULL;
