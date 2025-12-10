-- Migration : Créer la table flight_schedule
-- Date : 2025-12-10
-- Description : Table pour stocker les vols programmés ajoutés par les superviseurs

-- Créer la table flight_schedule
CREATE TABLE IF NOT EXISTS flight_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_number TEXT NOT NULL,
  airline TEXT NOT NULL,
  airline_code TEXT NOT NULL,
  departure TEXT NOT NULL,
  arrival TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  airport_code TEXT NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'boarding', 'departed', 'arrived', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer les index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_flight_schedule_airport ON flight_schedule(airport_code);
CREATE INDEX IF NOT EXISTS idx_flight_schedule_date ON flight_schedule(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_flight_schedule_flight_number ON flight_schedule(flight_number);
CREATE INDEX IF NOT EXISTS idx_flight_schedule_status ON flight_schedule(status);

-- Créer une fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_flight_schedule_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger pour updated_at
DROP TRIGGER IF EXISTS trigger_flight_schedule_updated_at ON flight_schedule;
CREATE TRIGGER trigger_flight_schedule_updated_at
  BEFORE UPDATE ON flight_schedule
  FOR EACH ROW
  EXECUTE FUNCTION update_flight_schedule_updated_at();

-- Ajouter des commentaires
COMMENT ON TABLE flight_schedule IS 'Vols programmés ajoutés par les superviseurs via le dashboard web';
COMMENT ON COLUMN flight_schedule.id IS 'Identifiant unique du vol';
COMMENT ON COLUMN flight_schedule.flight_number IS 'Numéro de vol (ex: ET80, 9U404)';
COMMENT ON COLUMN flight_schedule.airline IS 'Nom de la compagnie aérienne (ex: Ethiopian Airlines)';
COMMENT ON COLUMN flight_schedule.airline_code IS 'Code IATA de la compagnie (ex: ET, 9U, KQ)';
COMMENT ON COLUMN flight_schedule.departure IS 'Code aéroport de départ (ex: FIH, ADD)';
COMMENT ON COLUMN flight_schedule.arrival IS 'Code aéroport d''arrivée (ex: ADD, FIH)';
COMMENT ON COLUMN flight_schedule.scheduled_date IS 'Date prévue du vol';
COMMENT ON COLUMN flight_schedule.scheduled_time IS 'Heure prévue du décollage';
COMMENT ON COLUMN flight_schedule.airport_code IS 'Code de l''aéroport qui gère ce vol';
COMMENT ON COLUMN flight_schedule.status IS 'Statut du vol : scheduled, boarding, departed, arrived, cancelled';
COMMENT ON COLUMN flight_schedule.created_at IS 'Date de création de l''entrée';
COMMENT ON COLUMN flight_schedule.created_by IS 'ID de l''utilisateur qui a créé le vol';
COMMENT ON COLUMN flight_schedule.updated_at IS 'Date de dernière modification';

-- RLS (Row Level Security) Policies
ALTER TABLE flight_schedule ENABLE ROW LEVEL SECURITY;

-- Policy : Lecture publique (tous les utilisateurs authentifiés peuvent lire)
CREATE POLICY flight_schedule_select_policy ON flight_schedule
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy : Insertion réservée aux superviseurs
CREATE POLICY flight_schedule_insert_policy ON flight_schedule
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'supervisor'
    )
  );

-- Policy : Mise à jour réservée aux superviseurs
CREATE POLICY flight_schedule_update_policy ON flight_schedule
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'supervisor'
    )
  );

-- Policy : Suppression réservée aux superviseurs
CREATE POLICY flight_schedule_delete_policy ON flight_schedule
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'supervisor'
    )
  );

-- Vérification
SELECT 
  tablename, 
  schemaname 
FROM pg_tables 
WHERE tablename = 'flight_schedule';
