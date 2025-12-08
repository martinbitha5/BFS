-- ========================================
-- BFS - Baggage Found Solution
-- Migration: Ajout de la table raw_scans
-- ========================================

-- Nouvelle table pour stocker les données brutes des scans
CREATE TABLE IF NOT EXISTS raw_scans (
  -- Identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_data TEXT NOT NULL,
  scan_type TEXT NOT NULL CHECK (scan_type IN ('boarding_pass', 'baggage_tag')),
  
  -- Statuts du workflow (booléens)
  status_checkin BOOLEAN DEFAULT FALSE,
  status_baggage BOOLEAN DEFAULT FALSE,
  status_boarding BOOLEAN DEFAULT FALSE,
  status_arrival BOOLEAN DEFAULT FALSE,
  
  -- Métadonnées scan check-in
  checkin_at TIMESTAMP WITH TIME ZONE,
  checkin_by UUID REFERENCES users(id),
  
  -- Métadonnées scan baggage
  baggage_at TIMESTAMP WITH TIME ZONE,
  baggage_by UUID REFERENCES users(id),
  baggage_rfid_tag TEXT,
  
 -- Métadonnées scan boarding
  boarding_at TIMESTAMP WITH TIME ZONE,
  boarding_by UUID REFERENCES users(id),
  
  -- Métadonnées scan arrival
  arrival_at TIMESTAMP WITH TIME ZONE,
  arrival_by UUID REFERENCES users(id),
  
  -- Métadonnées générales
  airport_code TEXT NOT NULL,
  first_scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  scan_count INTEGER DEFAULT 1,
  
  -- Synchronisation
  synced BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_raw_scans_raw_data ON raw_scans(raw_data);
CREATE INDEX IF NOT EXISTS idx_raw_scans_airport ON raw_scans(airport_code);
CREATE INDEX IF NOT EXISTS idx_raw_scans_statuses ON raw_scans(status_checkin, status_baggage, status_boarding, status_arrival);
CREATE INDEX IF NOT EXISTS idx_raw_scans_rfid ON raw_scans(baggage_rfid_tag);
CREATE INDEX IF NOT EXISTS idx_raw_scans_scan_type ON raw_scans(scan_type);
CREATE INDEX IF NOT EXISTS idx_raw_scans_first_scanned ON raw_scans(first_scanned_at);

-- Activer RLS
ALTER TABLE raw_scans ENABLE ROW LEVEL SECURITY;

-- Politique : Les utilisateurs peuvent voir les scans de leur aéroport
CREATE POLICY "Users can view airport raw scans"
ON raw_scans FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.airport_code = raw_scans.airport_code
  )
);

-- Politique : Les utilisateurs peuvent créer des scans
CREATE POLICY "Users can create raw scans"
ON raw_scans FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.airport_code = raw_scans.airport_code
  )
);

-- Politique : Les utilisateurs peuvent mettre à jour les scans de leur aéroport
CREATE POLICY "Users can update airport raw scans"
ON raw_scans FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.airport_code = raw_scans.airport_code
  )
);

-- Trigger pour mettre à jour automatiquement updated_at
CREATE TRIGGER update_raw_scans_updated_at
BEFORE UPDATE ON raw_scans
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Commentaires pour documentation
COMMENT ON TABLE raw_scans IS 'Données brutes des scans de codes-barres (boarding pass et tags RFID) avec statuts de workflow';
COMMENT ON COLUMN raw_scans.raw_data IS 'Données brutes complètes scannées (sans parsing)';
COMMENT ON COLUMN raw_scans.scan_type IS 'Type de scan: boarding_pass ou baggage_tag';
COMMENT ON COLUMN raw_scans.status_checkin IS 'Statut check-in effectué';
COMMENT ON COLUMN raw_scans.status_baggage IS 'Statut enregistrement bagage effectué';
COMMENT ON COLUMN raw_scans.status_boarding IS 'Statut embarquement effectué';
COMMENT ON COLUMN raw_scans.status_arrival IS 'Statut arrivée effectué';
COMMENT ON COLUMN raw_scans.scan_count IS 'Nombre de fois que ce code-barre a été scanné';
