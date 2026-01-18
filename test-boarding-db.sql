-- Test de la structure boarding_status
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'boarding_status' AND table_schema = 'public';

-- Test: insérer un boarding valide
INSERT INTO public.boarding_status (passenger_id, boarded_at)
VALUES (
  'c32faa89-355d-4eca-bcee-62a41b37807a'::uuid,
  now()
)
ON CONFLICT (passenger_id) DO UPDATE SET boarded_at = now()
RETURNING *;
