-- ========================================
-- INSERT PASSAGER TEST POUR BOARDING
-- ========================================

-- Insérer un passager avec le PNR OAIMUM pour tester
INSERT INTO passengers (
  full_name,
  pnr,
  flight_number,
  seat_number,
  class,
  departure,
  arrival,
  airport_code,
  baggage_count,
  checked_in,
  checked_in_at,
  checked_in_by,
  created_at,
  updated_at
) VALUES (
  'MULUOPO MAWEJA PAPY',
  'OAIMUM',
  'ET0064',
  '15C',
  'ECONOMY',
  'FIH',
  'FBM',
  'FIH',
  0,
  true,
  NOW(),
  '4b060b1c-cce1-4f3f-aacc-6ee97b6295ac',  -- L'ID de l'utilisateur qui a fait le check-in
  NOW(),
  NOW()
)
ON CONFLICT (pnr) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  checked_in = true,
  checked_in_at = NOW(),
  updated_at = NOW()
RETURNING *;

-- Vérifier que le passager a été créé
SELECT id, pnr, full_name, flight_number, airport_code, checked_in, checked_in_at
FROM passengers
WHERE pnr = 'OAIMUM';
