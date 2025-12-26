-- Migration : Ajouter type de vol (départ/arrivée) et restrictions bagages
-- Date : 2025-12-26
-- Description : Ajout du type de vol pour distinguer départ/arrivée et restrictions pour bagages non enregistrés

-- Ajouter la colonne flight_type
ALTER TABLE flight_schedule 
ADD COLUMN IF NOT EXISTS flight_type TEXT DEFAULT 'departure' 
CHECK (flight_type IN ('departure', 'arrival'));

-- Ajouter les restrictions pour les bagages non enregistrés
ALTER TABLE flight_schedule 
ADD COLUMN IF NOT EXISTS baggage_restriction TEXT DEFAULT 'block' 
CHECK (baggage_restriction IN ('block', 'allow_with_payment', 'allow'));

-- Ajouter une note/description pour la restriction
ALTER TABLE flight_schedule 
ADD COLUMN IF NOT EXISTS restriction_note TEXT;

-- Créer un index pour le type de vol
CREATE INDEX IF NOT EXISTS idx_flight_schedule_flight_type ON flight_schedule(flight_type);

-- Commentaires
COMMENT ON COLUMN flight_schedule.flight_type IS 'Type de vol : departure (départ) ou arrival (arrivée)';
COMMENT ON COLUMN flight_schedule.baggage_restriction IS 'Restriction bagage non enregistré : block (bloquer), allow_with_payment (autoriser avec paiement), allow (autoriser)';
COMMENT ON COLUMN flight_schedule.restriction_note IS 'Note explicative pour la restriction';

-- Vérification
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'flight_schedule' 
AND column_name IN ('flight_type', 'baggage_restriction', 'restriction_note');

