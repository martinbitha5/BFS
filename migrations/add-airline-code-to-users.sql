-- Add airline_code column to users table
-- This allows supervisors to be assigned to specific airlines
-- Supervisors can only see flights from their assigned airline
-- Support and baggage_dispute users will have 'ALL' as their airline_code

ALTER TABLE users ADD COLUMN IF NOT EXISTS airline_code TEXT DEFAULT 'ALL';

-- Add index for efficient filtering by airline_code
CREATE INDEX IF NOT EXISTS idx_users_airline_code ON users(airline_code);

-- Add index for combined airport and airline filtering
CREATE INDEX IF NOT EXISTS idx_users_airport_airline ON users(airport_code, airline_code);

-- Add comment
COMMENT ON COLUMN users.airline_code IS 'Code IATA de la compagnie aérienne (ex: ET, KQ, AF). Support et baggage_dispute users ont "ALL"';
