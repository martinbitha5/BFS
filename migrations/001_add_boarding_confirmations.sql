-- =====================================================================
-- Migration: Ajout des tables pour Boarding Confirmation
-- Description: Ajoute le support complet du scan d'embarquement
-- Version: 1.0
-- =====================================================================

-- 1️⃣ Table de confirmation d'embarquement
CREATE TABLE IF NOT EXISTS boarding_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Références
  scan_id UUID REFERENCES raw_scans(id) ON DELETE CASCADE,
  passager_id UUID,
  
  -- Informations du passager
  passager_name VARCHAR(255),
  flight_number VARCHAR(10) NOT NULL,
  
  -- Détails d'embarquement
  gate VARCHAR(5),
  seat_number VARCHAR(5),
  
  -- Timestamps
  scanned_at TIMESTAMP DEFAULT NOW(),
  boarded_at TIMESTAMP NOT NULL,
  boarded_by UUID NOT NULL,
  airport_code CHAR(3),
  
  -- Synchronisation
  sync_status VARCHAR(20) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
  sync_error TEXT,
  sync_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2️⃣ Index pour les requêtes courantes
CREATE INDEX IF NOT EXISTS idx_boarding_confirmations_flight 
  ON boarding_confirmations(flight_number DESC);

CREATE INDEX IF NOT EXISTS idx_boarding_confirmations_passager 
  ON boarding_confirmations(passager_id);

CREATE INDEX IF NOT EXISTS idx_boarding_confirmations_boarded_at 
  ON boarding_confirmations(boarded_at DESC);

CREATE INDEX IF NOT EXISTS idx_boarding_confirmations_airport 
  ON boarding_confirmations(airport_code);

CREATE INDEX IF NOT EXISTS idx_boarding_confirmations_sync 
  ON boarding_confirmations(sync_status);

-- 3️⃣ Table pour l'historique des sessions d'embarquement
CREATE TABLE IF NOT EXISTS boarding_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Informations du vol
  flight_number VARCHAR(10) NOT NULL,
  departure_time TIMESTAMP,
  airport_code CHAR(3),
  
  -- Statistiques
  total_passengers INTEGER DEFAULT 0,
  boarded_count INTEGER DEFAULT 0,
  
  -- Session
  session_started TIMESTAMP DEFAULT NOW(),
  session_ended TIMESTAMP,
  session_opened_by UUID,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'cancelled')),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boarding_sessions_flight 
  ON boarding_sessions(flight_number, session_started DESC);

CREATE INDEX IF NOT EXISTS idx_boarding_sessions_status 
  ON boarding_sessions(status);

-- 4️⃣ Colonnes supplémentaires à raw_scans si n'existent pas
ALTER TABLE raw_scans ADD COLUMN IF NOT EXISTS gate VARCHAR(5);
ALTER TABLE raw_scans ADD COLUMN IF NOT EXISTS boarding_by UUID;
ALTER TABLE raw_scans ADD COLUMN IF NOT EXISTS boarding_at TIMESTAMP;

-- 5️⃣ Enable RLS pour boarding_confirmations si Supabase
ALTER TABLE boarding_confirmations ENABLE ROW LEVEL SECURITY;

-- Permettre l'accès basé sur l'aéroport (optionnel - adapter selon votre structure)
-- CREATE POLICY boarding_confirmations_by_airport 
--   ON boarding_confirmations 
--   FOR ALL 
--   USING (
--     airport_code = current_setting('app.current_airport_code')
--   );

-- 6️⃣ Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_boarding_confirmations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER boarding_confirmations_updated_at_trigger
BEFORE UPDATE ON boarding_confirmations
FOR EACH ROW
EXECUTE FUNCTION update_boarding_confirmations_updated_at();

-- 7️⃣ Fonction pour mettre à jour le compteur de boarding dans sessions
CREATE OR REPLACE FUNCTION sync_boarding_session_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sync_status = 'synced' THEN
    UPDATE boarding_sessions
    SET boarded_count = boarded_count + 1,
        updated_at = NOW()
    WHERE flight_number = NEW.flight_number
      AND status = 'active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER boarding_confirmations_sync_trigger
AFTER INSERT OR UPDATE ON boarding_confirmations
FOR EACH ROW
EXECUTE FUNCTION sync_boarding_session_count();

-- 8️⃣ Vues utiles
CREATE OR REPLACE VIEW boarding_summary AS
SELECT
  bc.flight_number,
  COUNT(*) as total_boarded,
  SUM(CASE WHEN bc.sync_status = 'synced' THEN 1 ELSE 0 END) as synced,
  SUM(CASE WHEN bc.sync_status = 'failed' THEN 1 ELSE 0 END) as failed,
  SUM(CASE WHEN bc.sync_status = 'pending' THEN 1 ELSE 0 END) as pending,
  MAX(bc.boarded_at) as last_boarding,
  COUNT(DISTINCT bc.boarded_by) as operators
FROM boarding_confirmations bc
GROUP BY bc.flight_number;

-- 9️⃣ Audit trail pour boarding
CREATE TABLE IF NOT EXISTS boarding_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Action
  action VARCHAR(50) NOT NULL,
  details JSONB,
  
  -- User & Context
  user_id UUID,
  airport_code CHAR(3),
  
  -- Reference
  confirmation_id UUID REFERENCES boarding_confirmations(id),
  
  -- Timestamp
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boarding_audit_confirmation 
  ON boarding_audit(confirmation_id);

CREATE INDEX IF NOT EXISTS idx_boarding_audit_user 
  ON boarding_audit(user_id);

-- =====================================================================
-- FIN Migration
-- =====================================================================
