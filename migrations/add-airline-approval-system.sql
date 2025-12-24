-- ========================================
-- Migration: Système d'approbation des compagnies aériennes
-- Date: 2025-01-XX
-- Description: Ajoute l'approbation pour les compagnies aériennes
-- ========================================

-- Ajouter les colonnes d'approbation à la table airlines
ALTER TABLE airlines 
ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Créer la table pour les demandes d'inscription en attente
CREATE TABLE IF NOT EXISTS airline_registration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code VARCHAR(2) NOT NULL UNIQUE CHECK (LENGTH(code) = 2),
  email TEXT UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL, -- Mot de passe hashé
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES users(id),
  rejection_reason TEXT,
  airline_id UUID REFERENCES airlines(id), -- ID de l'airline créée (si créée)
  notes TEXT, -- Notes additionnelles de la demande
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_airline_registration_requests_status ON airline_registration_requests(status);
CREATE INDEX IF NOT EXISTS idx_airline_registration_requests_email ON airline_registration_requests(email);
CREATE INDEX IF NOT EXISTS idx_airline_registration_requests_code ON airline_registration_requests(code);
CREATE INDEX IF NOT EXISTS idx_airline_registration_requests_requested_at ON airline_registration_requests(requested_at);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_airline_registration_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS trigger_airline_registration_requests_updated_at ON airline_registration_requests;
CREATE TRIGGER trigger_airline_registration_requests_updated_at
  BEFORE UPDATE ON airline_registration_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_airline_registration_requests_updated_at();

-- RLS pour airline_registration_requests
ALTER TABLE airline_registration_requests ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs support peuvent voir toutes les demandes
CREATE POLICY "Support can view all airline registration requests"
ON airline_registration_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'support'
    AND u.approved = true
  )
);

-- Les airlines peuvent voir leur propre demande (via email)
CREATE POLICY "Airlines can view own registration request"
ON airline_registration_requests FOR SELECT
USING (
  email IN (
    SELECT email FROM airlines WHERE id = auth.uid()
  )
);

-- Seuls les utilisateurs support peuvent approuver/rejeter
CREATE POLICY "Support can manage airline registration requests"
ON airline_registration_requests FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'support'
    AND u.approved = true
  )
);

-- Mettre à jour les airlines existantes comme approuvées (pour migration)
UPDATE airlines 
SET approved = true, approved_at = created_at
WHERE approved IS NULL OR approved = false;

-- Commentaires
COMMENT ON TABLE airline_registration_requests IS 'Demandes d''inscription en attente d''approbation pour compagnies aériennes';
COMMENT ON COLUMN airline_registration_requests.status IS 'Statut: pending (en attente), approved (approuvé), rejected (rejeté)';
COMMENT ON COLUMN airline_registration_requests.airline_id IS 'ID de l''airline créée après approbation';
COMMENT ON COLUMN airlines.approved IS 'Indique si la compagnie aérienne a été approuvée par le support';
COMMENT ON COLUMN airlines.approved_by IS 'ID de l''utilisateur support qui a approuvé';
COMMENT ON COLUMN airlines.rejection_reason IS 'Raison du rejet si la compagnie a été rejetée';

