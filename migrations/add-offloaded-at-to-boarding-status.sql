-- Migration: Ajouter offloaded_at dans boarding_status
-- Date: 2025-03-02
-- Description: Permet de distinguer "débarqué" (embarqué puis retiré) de "non embarqué" (jamais embarqué)
-- Impact: Table boarding_status

ALTER TABLE boarding_status 
ADD COLUMN IF NOT EXISTS offloaded_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN boarding_status.offloaded_at IS 'Date/heure du débarquement (offload) du passager';
