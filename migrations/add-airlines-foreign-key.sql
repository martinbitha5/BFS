-- Ajouter une foreign key entre birs_reports et airlines
-- Cela assure que seules les compagnies enregistrées peuvent uploader des BIRS

-- 1. Vérifier que la colonne airline_code existe dans birs_reports
-- Si elle n'existe pas, il faut d'abord l'ajouter :
-- ALTER TABLE birs_reports ADD COLUMN IF NOT EXISTS airline_code VARCHAR(2);

-- 2. Ajouter la foreign key (optionnel mais recommandé)
-- Note: ON DELETE RESTRICT empêche la suppression d'une compagnie si elle a des BIRS
ALTER TABLE birs_reports
ADD CONSTRAINT fk_birs_airline
FOREIGN KEY (airline_code) 
REFERENCES airlines(code)
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- 3. Créer un index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_birs_airline_code ON birs_reports(airline_code);

-- Commentaire
COMMENT ON CONSTRAINT fk_birs_airline ON birs_reports IS 
  'Lie les rapports BIRS aux compagnies aériennes enregistrées';
