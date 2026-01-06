-- ========================================
-- Migration: Ajouter le rôle baggage_dispute à la contrainte CHECK
-- Date: 2026-01-06
-- Description: Le rôle baggage_dispute manquait dans la contrainte de la table users
-- ========================================

-- Supprimer l'ancienne contrainte
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_role_check;

-- Recréer la contrainte avec tous les rôles incluant baggage_dispute
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('checkin', 'baggage', 'boarding', 'arrival', 'supervisor', 'baggage_dispute', 'support'));

-- Vérification
SELECT 'Contrainte users_role_check mise à jour avec succès' AS status;

-- Afficher la nouvelle contrainte
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'users'::regclass
AND conname = 'users_role_check';
