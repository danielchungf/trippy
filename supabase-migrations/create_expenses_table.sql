-- Create expenses table
CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  converted_amount NUMERIC(12, 2),
  category TEXT NOT NULL DEFAULT 'other',
  date TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient trip-based queries
CREATE INDEX idx_expenses_trip_id ON expenses(trip_id);
CREATE INDEX idx_expenses_trip_date ON expenses(trip_id, date);

-- Enable Row Level Security
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies (matching existing patterns for trip access)

CREATE POLICY "Users can view their trip expenses" ON expenses
  FOR SELECT USING (
    trip_id IN (
      SELECT id FROM trips WHERE owner_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "Users can insert expenses" ON expenses
  FOR INSERT WITH CHECK (
    trip_id IN (
      SELECT id FROM trips WHERE owner_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "Users can update expenses" ON expenses
  FOR UPDATE USING (
    trip_id IN (
      SELECT id FROM trips WHERE owner_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "Users can delete expenses" ON expenses
  FOR DELETE USING (
    trip_id IN (
      SELECT id FROM trips WHERE owner_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

-- Create trip_exchange_rates table
CREATE TABLE trip_exchange_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate NUMERIC(16, 6) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(trip_id, from_currency, to_currency)
);

CREATE INDEX idx_trip_exchange_rates_trip_id ON trip_exchange_rates(trip_id);

ALTER TABLE trip_exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view trip exchange rates" ON trip_exchange_rates
  FOR SELECT USING (
    trip_id IN (
      SELECT id FROM trips WHERE owner_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "Users can insert trip exchange rates" ON trip_exchange_rates
  FOR INSERT WITH CHECK (
    trip_id IN (
      SELECT id FROM trips WHERE owner_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "Users can update trip exchange rates" ON trip_exchange_rates
  FOR UPDATE USING (
    trip_id IN (
      SELECT id FROM trips WHERE owner_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "Users can delete trip exchange rates" ON trip_exchange_rates
  FOR DELETE USING (
    trip_id IN (
      SELECT id FROM trips WHERE owner_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

-- Add home_currency to trips table
ALTER TABLE trips ADD COLUMN home_currency TEXT NOT NULL DEFAULT 'USD';
