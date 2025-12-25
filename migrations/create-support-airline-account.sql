-- ========================================
-- Création du compte airline pour le support
-- Email: support@brsats.com
-- Mot de passe: 0827241919mA@
-- ========================================

-- Ajouter la colonne approved si elle n'existe pas (pour compatibilité)
ALTER TABLE airlines 
ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);

-- Supprimer le compte s'il existe déjà (pour éviter les doublons)
DELETE FROM airlines WHERE email = 'support@brsats.com';

-- ========================================
-- OPTION 1: Utiliser crypt() avec pgcrypto (PostgreSQL standard)
-- ========================================
-- Si cette option ne fonctionne pas dans Supabase, utilisez l'OPTION 2 ci-dessous

-- Vérifier que l'extension pgcrypto est activée
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO airlines (
  name,
  code,
  email,
  password,
  approved,
  approved_at,
  created_at,
  updated_at
) VALUES (
  'BRSATS Support',
  'BS',
  'support@brsats.com',
  crypt('0827241919mA@', gen_salt('bf', 10)),  -- Hash bcrypt avec 10 rounds
  true,
  NOW(),
  NOW(),
  NOW()
);

-- ========================================
-- OPTION 2: Utiliser le hash pré-généré (si OPTION 1 ne fonctionne pas)
-- ========================================
-- Décommentez cette section et commentez l'OPTION 1 si crypt() ne fonctionne pas dans Supabase

/*
INSERT INTO airlines (
  name,
  code,
  email,
  password,
  approved,
  approved_at,
  created_at,
  updated_at
) VALUES (
  'BRSATS Support',
  'BS',
  'support@brsats.com',
  '$2b$10$gjKcI4xVxz9UjFjjtEHDH.n3cmAVufIiRnEeMXejoromuyHlh4kMC',  -- Hash bcrypt pré-généré
  true,
  NOW(),
  NOW(),
  NOW()
);
*/

-- Vérifier que l'insertion a réussi
SELECT 
  id,
  name,
  code,
  email,
  approved,
  approved_at,
  created_at
FROM airlines 
WHERE email = 'support@brsats.com';
