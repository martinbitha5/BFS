-- ========================================
-- ANALYSE COMPLETE DU SCHEMA BFS
-- Exécutez ce script dans Supabase SQL Editor
-- ========================================

-- ========================================
-- PARTIE 1: DIAGNOSTIC - Voir l'état actuel
-- ========================================

-- 1.1 Voir toutes les tables existantes
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 1.2 Voir les colonnes de la table users
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 1.3 Voir les colonnes de la table baggages
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'baggages' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 1.4 Voir les colonnes de la table international_baggages
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'international_baggages' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 1.5 Vérifier si baggage_history existe
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'baggage_history' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 1.6 Vérifier si international_baggage_history existe
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'international_baggage_history' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 1.7 Vérifier si rush_actions existe
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'rush_actions' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 1.8 Voir la contrainte de rôle actuelle sur users
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'users'::regclass AND contype = 'c';

-- 1.9 Voir la contrainte de statut sur baggages
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'baggages'::regclass AND contype = 'c';

-- 1.10 Voir la contrainte de statut sur international_baggages
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'international_baggages'::regclass AND contype = 'c';

-- ========================================
-- PARTIE 2: CORRECTIONS NECESSAIRES
-- Exécutez cette partie APRES avoir vu les résultats de la partie 1
-- ========================================

-- 2.1 Ajouter les colonnes manquantes à international_baggages
ALTER TABLE international_baggages ADD COLUMN IF NOT EXISTS last_scanned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE international_baggages ADD COLUMN IF NOT EXISTS last_scanned_by UUID REFERENCES users(id);
ALTER TABLE international_baggages ADD COLUMN IF NOT EXISTS current_location TEXT;
ALTER TABLE international_baggages ADD COLUMN IF NOT EXISTS next_flight TEXT;

-- 2.2 Mettre à jour la contrainte de statut sur international_baggages pour inclure 'rush'
ALTER TABLE international_baggages DROP CONSTRAINT IF EXISTS international_baggages_status_check;
ALTER TABLE international_baggages ADD CONSTRAINT international_baggages_status_check 
  CHECK (status IN ('scanned', 'reconciled', 'unmatched', 'rush', 'pending'));

-- 2.3 Créer la table baggage_history si elle n'existe pas
CREATE TABLE IF NOT EXISTS baggage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baggage_id UUID NOT NULL REFERENCES baggages(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  location TEXT,
  scanned_by UUID REFERENCES users(id),
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_baggage_history_baggage_id ON baggage_history(baggage_id);
CREATE INDEX IF NOT EXISTS idx_baggage_history_created_at ON baggage_history(created_at DESC);

-- 2.4 Créer la table international_baggage_history si elle n'existe pas
CREATE TABLE IF NOT EXISTS international_baggage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baggage_id UUID NOT NULL REFERENCES international_baggages(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  location TEXT,
  scanned_by UUID REFERENCES users(id),
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intl_baggage_history_baggage_id ON international_baggage_history(baggage_id);
CREATE INDEX IF NOT EXISTS idx_intl_baggage_history_created_at ON international_baggage_history(created_at DESC);

-- 2.5 Mettre à jour la contrainte de rôle sur users pour inclure 'rush'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('checkin', 'baggage', 'boarding', 'arrival', 'supervisor', 'baggage_dispute', 'support', 'rush'));

-- 2.6 Mettre à jour la contrainte de rôle sur user_registration_requests
ALTER TABLE user_registration_requests DROP CONSTRAINT IF EXISTS user_registration_requests_role_check;
ALTER TABLE user_registration_requests ADD CONSTRAINT user_registration_requests_role_check 
  CHECK (role IN ('checkin', 'baggage', 'boarding', 'arrival', 'supervisor', 'baggage_dispute', 'support', 'rush'));

-- 2.7 Créer la table rush_actions si elle n'existe pas
CREATE TABLE IF NOT EXISTS rush_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baggage_id UUID NOT NULL,
  baggage_type VARCHAR(20) NOT NULL CHECK (baggage_type IN ('national', 'international')),
  tag_number VARCHAR(50) NOT NULL,
  reason TEXT NOT NULL,
  next_flight VARCHAR(50),
  declared_by UUID NOT NULL REFERENCES users(id),
  airport_code VARCHAR(10) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rush_actions_baggage ON rush_actions(baggage_id);
CREATE INDEX IF NOT EXISTS idx_rush_actions_tag ON rush_actions(tag_number);
CREATE INDEX IF NOT EXISTS idx_rush_actions_airport ON rush_actions(airport_code);
CREATE INDEX IF NOT EXISTS idx_rush_actions_date ON rush_actions(created_at DESC);

-- 2.8 RLS sur les nouvelles tables
ALTER TABLE baggage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE international_baggage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE rush_actions ENABLE ROW LEVEL SECURITY;

-- Politique permissive pour baggage_history (via service role de l'API)
DROP POLICY IF EXISTS baggage_history_all_policy ON baggage_history;
CREATE POLICY baggage_history_all_policy ON baggage_history FOR ALL USING (true);

DROP POLICY IF EXISTS intl_baggage_history_all_policy ON international_baggage_history;
CREATE POLICY intl_baggage_history_all_policy ON international_baggage_history FOR ALL USING (true);

DROP POLICY IF EXISTS rush_actions_all_policy ON rush_actions;
CREATE POLICY rush_actions_all_policy ON rush_actions FOR ALL USING (true);

-- ========================================
-- PARTIE 3: VERIFICATION FINALE
-- ========================================

-- 3.1 Vérifier les colonnes de international_baggages après corrections
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'international_baggages' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3.2 Compter les données existantes
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL SELECT 'passengers', COUNT(*) FROM passengers
UNION ALL SELECT 'baggages', COUNT(*) FROM baggages
UNION ALL SELECT 'international_baggages', COUNT(*) FROM international_baggages
UNION ALL SELECT 'baggage_history', COUNT(*) FROM baggage_history
UNION ALL SELECT 'international_baggage_history', COUNT(*) FROM international_baggage_history
UNION ALL SELECT 'rush_actions', COUNT(*) FROM rush_actions;

-- 3.3 Voir les contraintes finales
SELECT table_name, constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public' 
AND table_name IN ('users', 'baggages', 'international_baggages', 'user_registration_requests')
AND constraint_type = 'CHECK'
ORDER BY table_name;
