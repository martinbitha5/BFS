-- ========================================
-- Création du compte airline pour le support (Version simplifiée)
-- Email: support@brsats.com
-- Mot de passe: 0827241919mA@
-- ========================================
-- Cette version utilise le hash bcrypt pré-généré (recommandé pour Supabase)

-- Ajouter la colonne approved si elle n'existe pas
ALTER TABLE airlines 
ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);

-- Supprimer le compte s'il existe déjà
DELETE FROM airlines WHERE email = 'support@brsats.com';

-- Insérer le compte avec le hash pré-généré
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
  'BRSATS Support',           -- Nom de la compagnie
  'BS',                        -- Code IATA (2 lettres)
  'support@brsats.com',        -- Email
  '$2b$10$gjKcI4xVxz9UjFjjtEHDH.n3cmAVufIiRnEeMXejoromuyHlh4kMC',  -- Mot de passe hashé (0827241919mA@)
  true,                        -- Approuvé directement
  NOW(),                       -- Date d'approbation
  NOW(),
  NOW()
);

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

