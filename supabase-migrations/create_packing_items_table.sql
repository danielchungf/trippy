-- Create packing_items table
CREATE TABLE packing_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'misc',
  quantity INTEGER NOT NULL DEFAULT 1,
  is_packed BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient trip-based queries
CREATE INDEX idx_packing_items_trip_id ON packing_items(trip_id);

-- Enable Row Level Security
ALTER TABLE packing_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies (matching existing patterns for trip access)

-- Users can view packing items for trips they own or are members of
CREATE POLICY "Users can view their trip packing items" ON packing_items
  FOR SELECT USING (
    trip_id IN (
      SELECT id FROM trips WHERE owner_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

-- Users can insert packing items for trips they have access to
CREATE POLICY "Users can insert packing items" ON packing_items
  FOR INSERT WITH CHECK (
    trip_id IN (
      SELECT id FROM trips WHERE owner_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

-- Users can update packing items for trips they have access to
CREATE POLICY "Users can update packing items" ON packing_items
  FOR UPDATE USING (
    trip_id IN (
      SELECT id FROM trips WHERE owner_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

-- Users can delete packing items for trips they have access to
CREATE POLICY "Users can delete packing items" ON packing_items
  FOR DELETE USING (
    trip_id IN (
      SELECT id FROM trips WHERE owner_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );
