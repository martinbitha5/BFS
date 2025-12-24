-- ========================================
-- Migration: Restrictions de bagages
-- Date: 2025-01-XX
-- Description: Ajoute les restrictions de bagages selon le boarding pass
--              et le système d'autorisation pour bagages supplémentaires
-- ========================================

-- Créer la table pour les demandes d'autorisation de bagages supplémentaires
CREATE TABLE IF NOT EXISTS baggage_authorization_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id UUID NOT NULL REFERENCES passengers(id) ON DELETE CASCADE,
  rfid_tag TEXT NOT NULL,
  requested_baggage_count INTEGER NOT NULL, -- Nombre de bagages demandés (ex: 3)
  declared_baggage_count INTEGER NOT NULL, -- Nombre déclaré dans le boarding (ex: 2)
  current_baggage_count INTEGER NOT NULL, -- Nombre actuel de bagages liés au passager
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES users(id),
  rejection_reason TEXT,
  baggage_id UUID REFERENCES baggages(id), -- ID du bagage créé après approbation
  notes TEXT, -- Notes additionnelles
  airport_code TEXT NOT NULL,
  flight_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_baggage_auth_requests_status ON baggage_authorization_requests(status);
CREATE INDEX IF NOT EXISTS idx_baggage_auth_requests_passenger ON baggage_authorization_requests(passenger_id);
CREATE INDEX IF NOT EXISTS idx_baggage_auth_requests_airport ON baggage_authorization_requests(airport_code);
CREATE INDEX IF NOT EXISTS idx_baggage_auth_requests_rfid ON baggage_authorization_requests(rfid_tag);
CREATE INDEX IF NOT EXISTS idx_baggage_auth_requests_requested_at ON baggage_authorization_requests(requested_at);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_baggage_auth_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS trigger_baggage_auth_requests_updated_at ON baggage_authorization_requests;
CREATE TRIGGER trigger_baggage_auth_requests_updated_at
  BEFORE UPDATE ON baggage_authorization_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_baggage_auth_requests_updated_at();

-- RLS pour baggage_authorization_requests
ALTER TABLE baggage_authorization_requests ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs support peuvent voir toutes les demandes
CREATE POLICY "Support can view all baggage authorization requests"
ON baggage_authorization_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'support'
    AND u.approved = true
  )
);

-- Les utilisateurs peuvent voir les demandes de leur aéroport (pour les superviseurs)
CREATE POLICY "Users can view airport baggage authorization requests"
ON baggage_authorization_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.airport_code = baggage_authorization_requests.airport_code
  )
);

-- Seuls les utilisateurs support peuvent approuver/rejeter
CREATE POLICY "Support can manage baggage authorization requests"
ON baggage_authorization_requests FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'support'
    AND u.approved = true
  )
);

-- Ajouter une colonne pour marquer les bagages autorisés manuellement
ALTER TABLE baggages 
ADD COLUMN IF NOT EXISTS manually_authorized BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS authorization_request_id UUID REFERENCES baggage_authorization_requests(id);

-- Index pour les bagages autorisés manuellement
CREATE INDEX IF NOT EXISTS idx_baggages_manually_authorized ON baggages(manually_authorized);
CREATE INDEX IF NOT EXISTS idx_baggages_auth_request ON baggages(authorization_request_id);

-- Commentaires
COMMENT ON TABLE baggage_authorization_requests IS 'Demandes d''autorisation pour bagages supplémentaires dépassant le nombre déclaré dans le boarding pass';
COMMENT ON COLUMN baggage_authorization_requests.requested_baggage_count IS 'Nombre total de bagages que l''agent essaie d''ajouter';
COMMENT ON COLUMN baggage_authorization_requests.declared_baggage_count IS 'Nombre de bagages déclaré dans le boarding pass';
COMMENT ON COLUMN baggage_authorization_requests.current_baggage_count IS 'Nombre actuel de bagages déjà liés au passager';
COMMENT ON COLUMN baggage_authorization_requests.baggage_id IS 'ID du bagage créé après approbation';
COMMENT ON COLUMN baggages.manually_authorized IS 'Indique si ce bagage a été autorisé manuellement par le support';
COMMENT ON COLUMN baggages.authorization_request_id IS 'ID de la demande d''autorisation associée';

