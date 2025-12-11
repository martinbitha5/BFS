-- ============================================
-- CONNECTER LA TABLE AIRLINES AUX BIRS_REPORTS
-- ============================================
-- À exécuter APRÈS avoir nettoyé les données avec clean-all-birs-data.sql

-- 1. Vérifier qu'il n'y a plus de données orphelines
SELECT 'Vérification des codes compagnies dans birs_reports' as etape;
SELECT DISTINCT airline_code 
FROM birs_reports 
WHERE airline_code NOT IN (SELECT code FROM airlines)
  AND airline_code IS NOT NULL;
-- (Cette requête doit retourner 0 lignes)

-- 2. Créer la foreign key
ALTER TABLE birs_reports
ADD CONSTRAINT fk_birs_airline
FOREIGN KEY (airline_code) 
REFERENCES airlines(code)
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- 3. Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_birs_airline_code ON birs_reports(airline_code);

-- 4. Vérifier que la contrainte est bien créée
SELECT 
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'birs_reports';

-- Message de confirmation
SELECT '✅ Table airlines connectée à birs_reports avec succès!' as status;
