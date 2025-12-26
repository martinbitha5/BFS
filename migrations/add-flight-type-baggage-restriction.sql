-- Migration : Ajouter flight_type et baggage_restriction à flight_schedule
-- Date : 2025-12-26
-- Description : Ajoute la distinction vol départ/arrivée et les restrictions bagages

-- Ajouter la colonne flight_type (départ ou arrivée)
ALTER TABLE flight_schedule 
ADD COLUMN IF NOT EXISTS flight_type TEXT DEFAULT 'departure' 
CHECK (flight_type IN ('departure', 'arrival'));

-- Ajouter la colonne baggage_restriction (restriction pour bagages non enregistrés)
ALTER TABLE flight_schedule 
ADD COLUMN IF NOT EXISTS baggage_restriction TEXT DEFAULT 'block' 
CHECK (baggage_restriction IN ('block', 'allow_with_payment', 'allow'));

-- Ajouter la colonne restriction_note (note explicative optionnelle)
ALTER TABLE flight_schedule 
ADD COLUMN IF NOT EXISTS restriction_note TEXT;

-- Créer un index pour optimiser les requêtes par type de vol
CREATE INDEX IF NOT EXISTS idx_flight_schedule_flight_type ON flight_schedule(flight_type);

-- Créer un index pour les restrictions bagages
CREATE INDEX IF NOT EXISTS idx_flight_schedule_baggage_restriction ON flight_schedule(baggage_restriction);

-- Ajouter des commentaires
COMMENT ON COLUMN flight_schedule.flight_type IS 'Type de vol: departure (départ) ou arrival (arrivée)';
COMMENT ON COLUMN flight_schedule.baggage_restriction IS 'Restriction pour bagages non enregistrés: block (bloquer/investigation), allow_with_payment (autoriser avec paiement), allow (autoriser sans restriction)';
COMMENT ON COLUMN flight_schedule.restriction_note IS 'Note explicative pour la restriction (instructions pour l''agent)';

-- Vérification
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'flight_schedule' 
AND column_name IN ('flight_type', 'baggage_restriction', 'restriction_note');

