-- Add focal point columns to trips table for cover image positioning
-- These values represent the focal point as percentages (0-1) where 0.5 is center

ALTER TABLE trips
ADD COLUMN IF NOT EXISTS cover_image_focus_x REAL DEFAULT 0.5,
ADD COLUMN IF NOT EXISTS cover_image_focus_y REAL DEFAULT 0.5;

-- Add constraints to ensure values are between 0 and 1
ALTER TABLE trips
ADD CONSTRAINT IF NOT EXISTS cover_image_focus_x_range
  CHECK (cover_image_focus_x >= 0 AND cover_image_focus_x <= 1);

ALTER TABLE trips
ADD CONSTRAINT IF NOT EXISTS cover_image_focus_y_range
  CHECK (cover_image_focus_y >= 0 AND cover_image_focus_y <= 1);
