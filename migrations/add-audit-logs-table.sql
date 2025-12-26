-- ========================================
-- Migration: Création de la table audit_logs
-- Pour le suivi des actions dans le système
-- ========================================

-- Créer la table audit_logs si elle n'existe pas
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  description TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  airport_code TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_audit_logs_airport_code ON audit_logs(airport_code);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_airport_created ON audit_logs(airport_code, created_at DESC);

-- Activer RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Users can view airport audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can create audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Service can access all audit logs" ON audit_logs;

-- Politique: Les utilisateurs peuvent voir les logs de leur aéroport
CREATE POLICY "Users can view airport audit logs"
ON audit_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.airport_code = audit_logs.airport_code
  )
);

-- Politique: Les utilisateurs peuvent créer des logs pour leur aéroport
CREATE POLICY "Users can create audit logs"
ON audit_logs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.airport_code = audit_logs.airport_code
  )
);

-- Politique: Permettre au service key d'accéder à tous les logs
CREATE POLICY "Service can access all audit logs"
ON audit_logs FOR ALL
USING (true)
WITH CHECK (true);

-- Ajouter le champ is_approved à la table users s'il n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'is_approved'
  ) THEN
    ALTER TABLE users ADD COLUMN is_approved BOOLEAN DEFAULT false;
  END IF;
END
$$;

-- Ajouter le champ last_login à la table users s'il n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'last_login'
  ) THEN
    ALTER TABLE users ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;
  END IF;
END
$$;

-- Commentaires
COMMENT ON TABLE audit_logs IS 'Journal d''audit des actions effectuées dans le système';
COMMENT ON COLUMN audit_logs.action IS 'Type d''action effectuée (CHECKIN_PASSENGER, BOARD_PASSENGER, etc.)';
COMMENT ON COLUMN audit_logs.entity_type IS 'Type d''entité concernée (passenger, baggage, user, etc.)';
COMMENT ON COLUMN audit_logs.entity_id IS 'ID de l''entité concernée';
COMMENT ON COLUMN audit_logs.description IS 'Description lisible de l''action';
COMMENT ON COLUMN audit_logs.metadata IS 'Données supplémentaires en JSON';

