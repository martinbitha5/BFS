-- ========================================
-- Migration: Système d'approbation des utilisateurs
-- Date: 2025-01-XX
-- Description: Ajoute l'approbation pour superviseurs et litiges bagages
-- ========================================

-- Ajouter les colonnes d'approbation à la table users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Ajouter le nouveau rôle "baggage_dispute" pour les litiges bagages
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('checkin', 'baggage', 'boarding', 'arrival', 'supervisor', 'baggage_dispute', 'support'));

-- Créer la table pour les demandes d'inscription en attente
CREATE TABLE IF NOT EXISTS user_registration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  airport_code TEXT,
  role TEXT NOT NULL CHECK (role IN ('supervisor', 'baggage_dispute')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES users(id),
  rejection_reason TEXT,
  auth_user_id UUID, -- ID de l'utilisateur créé dans Supabase Auth (si créé)
  notes TEXT, -- Notes additionnelles de la demande
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_user_registration_requests_status ON user_registration_requests(status);
CREATE INDEX IF NOT EXISTS idx_user_registration_requests_email ON user_registration_requests(email);
CREATE INDEX IF NOT EXISTS idx_user_registration_requests_role ON user_registration_requests(role);
CREATE INDEX IF NOT EXISTS idx_user_registration_requests_requested_at ON user_registration_requests(requested_at);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_user_registration_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS trigger_user_registration_requests_updated_at ON user_registration_requests;
CREATE TRIGGER trigger_user_registration_requests_updated_at
  BEFORE UPDATE ON user_registration_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_user_registration_requests_updated_at();

-- RLS pour user_registration_requests
ALTER TABLE user_registration_requests ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs support peuvent voir toutes les demandes
CREATE POLICY "Support can view all registration requests"
ON user_registration_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'support'
    AND u.approved = true
  )
);

-- Les utilisateurs peuvent voir leur propre demande
CREATE POLICY "Users can view own registration request"
ON user_registration_requests FOR SELECT
USING (
  email IN (
    SELECT email FROM users WHERE id = auth.uid()
  )
);

-- Seuls les utilisateurs support peuvent approuver/rejeter
CREATE POLICY "Support can manage registration requests"
ON user_registration_requests FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'support'
    AND u.approved = true
  )
);

-- Mettre à jour les utilisateurs existants comme approuvés (pour migration)
UPDATE users 
SET approved = true, approved_at = created_at
WHERE approved IS NULL OR approved = false;

-- Commentaires
COMMENT ON TABLE user_registration_requests IS 'Demandes d''inscription en attente d''approbation pour superviseurs et litiges bagages';
COMMENT ON COLUMN user_registration_requests.status IS 'Statut: pending (en attente), approved (approuvé), rejected (rejeté)';
COMMENT ON COLUMN user_registration_requests.role IS 'Rôle demandé: supervisor (aéroport spécifique) ou baggage_dispute (tous les aéroports)';
COMMENT ON COLUMN users.approved IS 'Indique si l''utilisateur a été approuvé par le support';
COMMENT ON COLUMN users.approved_by IS 'ID de l''utilisateur support qui a approuvé';
COMMENT ON COLUMN users.rejection_reason IS 'Raison du rejet si l''utilisateur a été rejeté';

