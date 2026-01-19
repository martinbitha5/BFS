-- Migration: Add UNIQUE constraint on (pnr, airport_code) to passengers table
-- Date: 2026-01-19
-- Description: Prevents duplicate passengers with same PNR at same airport

-- Add UNIQUE constraint if it doesn't exist
ALTER TABLE passengers
ADD CONSTRAINT passengers_pnr_airport_code_unique UNIQUE (pnr, airport_code);

-- Note: If this constraint already exists, you'll get an error.
-- To run this safely on Supabase:
-- 1. Go to Supabase Dashboard -> SQL Editor
-- 2. Copy and paste this migration
-- 3. Click Run
-- 4. If you get "constraint already exists", that's fine - the constraint is already there

-- After this migration, the API endpoint /api/v1/passengers/sync will use the constraint
-- to properly handle duplicate passengers by updating existing records instead of creating new ones.
