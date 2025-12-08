-- Script SQL pour insérer des données de test raw_scans dans Supabase
-- Exécutez ce script dans le SQL Editor de Supabase

-- Insérer 3 scans de test avec différents formats
INSERT INTO raw_scans (
  raw_data,
  scan_type,
  status_checkin,
  status_baggage,
  status_boarding,
  status_arrival,
  checkin_at,
  checkin_by,
  airport_code,
  first_scanned_at,
  last_scanned_at,
  scan_count,
  created_at,
  updated_at
) VALUES
-- Scan 1: Air Congo Boarding Pass (format valide)
(
  'M1KALONJI KABWE/OSCAREYFMKNE FIHFBM9U123 335M031G0009',
  'boarding_pass',
  true,
  false,
  false,
  false,
  NOW(),
  (SELECT id FROM users LIMIT 1),
  'FIH',
  NOW(),
  NOW(),
  1,
  NOW(),
  NOW()
),

-- Scan 2: Ethiopian Airlines Boarding Pass (format valide)
(
  'M1SMITH/JOHN WILLIAMET701 ADDFBM ET0840 335M031G0009 1PC',
  'boarding_pass',
  true,
  true,
  false,
  false,
  NOW(),
  (SELECT id FROM users LIMIT 1),
  'FIH',
  NOW(),
  NOW(),
  2,
  NOW(),
  NOW()
),

-- Scan 3: Données invalides (pour tester les erreurs de parsing)
(
  'INVALID_DATA_FORMAT_12345',
  'boarding_pass',
  true,
  false,
  false,
  false,
  NOW(),
  (SELECT id FROM users LIMIT 1),
  'FIH',
  NOW(),
  NOW(),
  1,
  NOW(),
  NOW()
);

-- Vérifier que les données sont insérées
SELECT id, scan_type, status_checkin, status_baggage, airport_code, scan_count
FROM raw_scans
ORDER BY created_at DESC
LIMIT 10;
