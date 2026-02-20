-- Migration: Add origin column to baggages table
-- Description: Adds origin field for manual baggage tracking

-- Add origin column to baggages table
ALTER TABLE baggages ADD COLUMN origin TEXT;

-- Add index for origin field
CREATE INDEX idx_baggages_origin ON baggages(origin);

-- Update existing manual baggages to have a default origin if needed
UPDATE baggages SET origin = airport_code WHERE manually_authorized = true AND origin IS NULL;