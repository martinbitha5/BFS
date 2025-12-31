-- Migration: Ajouter les champs d'approbation à la table users
-- Date: 2024-12-31
-- Description: Ajouter is_approved, approved_at, approved_by, rejection_reason
-- Impact: Table users
-- CRITIQUE: Ces champs sont utilisés par l'API mais manquent dans le schéma

-- ========================================
-- ÉTAPE 1: Ajouter les colonnes
-- ========================================

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- ========================================
-- ÉTAPE 2: Créer les index
-- ========================================

CREATE INDEX IF NOT EXISTS idx_users_is_approved ON users(is_approved);
CREATE INDEX IF NOT EXISTS idx_users_approved_by ON users(approved_by);

-- ========================================
-- NOTES
-- ========================================
-- Cette migration est IDEMPOTENTE (peut être exécutée plusieurs fois)
-- Elle corrige l'incohérence entre le schéma DB et l'API
-- Les utilisateurs existants seront marqués is_approved=false par défaut
