-- ============================================
-- MIGRATION: Ajouter airline_code aux passagers existants
-- ============================================

-- 1. Ajouter la colonne airline_code si elle n'existe pas déjà
ALTER TABLE passengers ADD COLUMN IF NOT EXISTS airline_code TEXT;

-- 2. Créer un index sur la colonne airline_code
CREATE INDEX IF NOT EXISTS idx_passengers_airline_code ON passengers(airline_code);

-- 3. Mettre à jour les passagers existants en extrayant le code compagnie du flight_number
-- Ex: 'ET64' -> 'ET', 'KQ555' -> 'KQ'
UPDATE passengers 
SET airline_code = CASE 
    WHEN flight_number IS NOT NULL AND LENGTH(flight_number) >= 2 
    THEN SUBSTRING(flight_number FROM 1 FOR 2)
    ELSE NULL 
END
WHERE airline_code IS NULL;

-- 4. Vérification: Afficher le nombre de passagers par compagnie
SELECT airline_code, COUNT(*) as total 
FROM passengers 
WHERE airline_code IS NOT NULL 
GROUP BY airline_code 
ORDER BY total DESC;

-- 5. Vérification: Afficher les passagers sans compagnie (volontaire)
SELECT COUNT(*) as passagers_sans_compagnie 
FROM passengers 
WHERE airline_code IS NULL AND flight_number IS NULL;
