-- Migration pour permettre les codes IATA de 2 ou 3 caractères
-- Les codes IATA peuvent être de 2 caractères (TK, AF, ET) ou 3 caractères (NBI, etc.)

-- Étape 1: Modifier le type de colonne pour permettre 3 caractères
ALTER TABLE airlines ALTER COLUMN code TYPE VARCHAR(3);

-- Étape 2: Supprimer l'ancienne contrainte de vérification
ALTER TABLE airlines DROP CONSTRAINT IF EXISTS airlines_code_check;

-- Étape 3: Ajouter la nouvelle contrainte qui autorise 2 ou 3 caractères
ALTER TABLE airlines ADD CONSTRAINT airlines_code_check CHECK (LENGTH(code) >= 2 AND LENGTH(code) <= 3);

-- Mettre à jour le commentaire
COMMENT ON COLUMN airlines.code IS 'Code IATA à 2 ou 3 lettres (ex: ET, TK, AF, NBI)';

-- Vérification
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'airlines' AND column_name = 'code';
