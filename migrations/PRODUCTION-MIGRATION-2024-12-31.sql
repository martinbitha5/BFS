-- ========================================
-- MIGRATION PRODUCTION - 2024-12-31
-- Description: Mise à jour complète du schéma pour production
-- IMPORTANT: Ce script est IDEMPOTENT (peut être exécuté plusieurs fois)
-- ========================================

-- ========================================
-- PARTIE 1: Correction international_baggages (rfid_tag → tag_number)
-- ========================================
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'international_baggages' 
        AND column_name = 'rfid_tag'
    ) THEN
        ALTER TABLE international_baggages RENAME COLUMN rfid_tag TO tag_number;
        RAISE NOTICE '✓ international_baggages.rfid_tag renommé en tag_number';
    ELSE
        RAISE NOTICE '✓ international_baggages.tag_number existe déjà';
    END IF;
END $$;

DROP INDEX IF EXISTS idx_international_baggages_rfid_tag;
CREATE INDEX IF NOT EXISTS idx_international_baggages_tag_number ON international_baggages(tag_number);

-- ========================================
-- PARTIE 2: Ajouter champs approbation à users
-- ========================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_users_is_approved ON users(is_approved);
CREATE INDEX IF NOT EXISTS idx_users_approved_by ON users(approved_by);

-- ========================================
-- PARTIE 3: Ajouter champs autorisation à baggages
-- ========================================
ALTER TABLE baggages ADD COLUMN IF NOT EXISTS manually_authorized BOOLEAN DEFAULT false;

-- Vérifier si baggage_authorization_requests existe avant d'ajouter la FK
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'baggage_authorization_requests') THEN
        ALTER TABLE baggages ADD COLUMN IF NOT EXISTS authorization_request_id UUID REFERENCES baggage_authorization_requests(id);
    ELSE
        ALTER TABLE baggages ADD COLUMN IF NOT EXISTS authorization_request_id UUID;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_baggages_manually_authorized ON baggages(manually_authorized);
CREATE INDEX IF NOT EXISTS idx_baggages_auth_request ON baggages(authorization_request_id);

-- ========================================
-- PARTIE 4: Créer table airlines
-- ========================================
CREATE TABLE IF NOT EXISTS airlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE CHECK (LENGTH(code) = 2),
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  approved BOOLEAN DEFAULT false,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_airlines_code ON airlines(code);
CREATE INDEX IF NOT EXISTS idx_airlines_email ON airlines(email);
CREATE INDEX IF NOT EXISTS idx_airlines_approved ON airlines(approved);

-- Trigger pour airlines
DROP TRIGGER IF EXISTS update_airlines_updated_at ON airlines;
CREATE TRIGGER update_airlines_updated_at
BEFORE UPDATE ON airlines
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- PARTIE 5: Créer table airline_registration_requests
-- ========================================
CREATE TABLE IF NOT EXISTS airline_registration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL CHECK (LENGTH(code) = 2),
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES users(id),
  rejection_reason TEXT,
  airline_id UUID REFERENCES airlines(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_airline_reg_requests_status ON airline_registration_requests(status);
CREATE INDEX IF NOT EXISTS idx_airline_reg_requests_email ON airline_registration_requests(email);
CREATE INDEX IF NOT EXISTS idx_airline_reg_requests_code ON airline_registration_requests(code);

DROP TRIGGER IF EXISTS update_airline_reg_requests_updated_at ON airline_registration_requests;
CREATE TRIGGER update_airline_reg_requests_updated_at
BEFORE UPDATE ON airline_registration_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- PARTIE 6: Créer table user_registration_requests
-- ========================================
CREATE TABLE IF NOT EXISTS user_registration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  airport_code TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('checkin', 'baggage', 'boarding', 'arrival', 'supervisor')),
  auth_user_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES users(id),
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_reg_requests_status ON user_registration_requests(status);
CREATE INDEX IF NOT EXISTS idx_user_reg_requests_email ON user_registration_requests(email);
CREATE INDEX IF NOT EXISTS idx_user_reg_requests_airport ON user_registration_requests(airport_code);

DROP TRIGGER IF EXISTS update_user_reg_requests_updated_at ON user_registration_requests;
CREATE TRIGGER update_user_reg_requests_updated_at
BEFORE UPDATE ON user_registration_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- PARTIE 7: Créer table baggage_authorization_requests
-- ========================================
CREATE TABLE IF NOT EXISTS baggage_authorization_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id UUID NOT NULL REFERENCES passengers(id) ON DELETE CASCADE,
  rfid_tag TEXT NOT NULL,
  requested_baggage_count INTEGER NOT NULL,
  declared_baggage_count INTEGER NOT NULL,
  current_baggage_count INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES users(id),
  rejection_reason TEXT,
  baggage_id UUID REFERENCES baggages(id),
  notes TEXT,
  airport_code TEXT NOT NULL,
  flight_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_baggage_auth_requests_status ON baggage_authorization_requests(status);
CREATE INDEX IF NOT EXISTS idx_baggage_auth_requests_passenger ON baggage_authorization_requests(passenger_id);
CREATE INDEX IF NOT EXISTS idx_baggage_auth_requests_airport ON baggage_authorization_requests(airport_code);
CREATE INDEX IF NOT EXISTS idx_baggage_auth_requests_rfid ON baggage_authorization_requests(rfid_tag);

DROP TRIGGER IF EXISTS update_baggage_auth_requests_updated_at ON baggage_authorization_requests;
CREATE TRIGGER update_baggage_auth_requests_updated_at
BEFORE UPDATE ON baggage_authorization_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Maintenant ajouter la FK si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'baggages_authorization_request_id_fkey'
        AND table_name = 'baggages'
    ) THEN
        ALTER TABLE baggages 
        ADD CONSTRAINT baggages_authorization_request_id_fkey 
        FOREIGN KEY (authorization_request_id) REFERENCES baggage_authorization_requests(id);
        RAISE NOTICE '✓ FK ajoutée pour baggages.authorization_request_id';
    END IF;
END $$;

-- ========================================
-- PARTIE 8: Activer RLS et créer policies
-- ========================================

-- Activer RLS (ne fait rien si déjà activé)
ALTER TABLE airlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE airline_registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE baggage_authorization_requests ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Airlines can view own profile" ON airlines;
DROP POLICY IF EXISTS "Airlines can update own profile" ON airlines;
DROP POLICY IF EXISTS "Support can view all airlines" ON airlines;
DROP POLICY IF EXISTS "Support can view all airline registration requests" ON airline_registration_requests;
DROP POLICY IF EXISTS "Support can manage airline registration requests" ON airline_registration_requests;
DROP POLICY IF EXISTS "Support can view all user registration requests" ON user_registration_requests;
DROP POLICY IF EXISTS "Support can manage user registration requests" ON user_registration_requests;
DROP POLICY IF EXISTS "Users can view airport baggage authorization requests" ON baggage_authorization_requests;
DROP POLICY IF EXISTS "Users can create baggage authorization requests" ON baggage_authorization_requests;
DROP POLICY IF EXISTS "Support can manage baggage authorization requests" ON baggage_authorization_requests;

-- Créer les nouvelles policies
CREATE POLICY "Airlines can view own profile"
ON airlines FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Airlines can update own profile"
ON airlines FOR UPDATE
USING (id = auth.uid());

CREATE POLICY "Support can view all airlines"
ON airlines FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'supervisor'
    AND u.is_approved = true
  )
);

CREATE POLICY "Support can view all airline registration requests"
ON airline_registration_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'supervisor'
    AND u.is_approved = true
  )
);

CREATE POLICY "Support can manage airline registration requests"
ON airline_registration_requests FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'supervisor'
    AND u.is_approved = true
  )
);

CREATE POLICY "Support can view all user registration requests"
ON user_registration_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'supervisor'
    AND u.is_approved = true
  )
);

CREATE POLICY "Support can manage user registration requests"
ON user_registration_requests FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'supervisor'
    AND u.is_approved = true
  )
);

CREATE POLICY "Users can view airport baggage authorization requests"
ON baggage_authorization_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.airport_code = baggage_authorization_requests.airport_code
  )
);

CREATE POLICY "Users can create baggage authorization requests"
ON baggage_authorization_requests FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.airport_code = baggage_authorization_requests.airport_code
  )
);

CREATE POLICY "Support can manage baggage authorization requests"
ON baggage_authorization_requests FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'supervisor'
  )
);

-- ========================================
-- VERIFICATION FINALE
-- ========================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ MIGRATION TERMINÉE AVEC SUCCÈS';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tables créées/mises à jour:';
    RAISE NOTICE '  - users (champs approbation ajoutés)';
    RAISE NOTICE '  - baggages (champs autorisation ajoutés)';
    RAISE NOTICE '  - international_baggages (nomenclature corrigée)';
    RAISE NOTICE '  - airlines';
    RAISE NOTICE '  - airline_registration_requests';
    RAISE NOTICE '  - user_registration_requests';
    RAISE NOTICE '  - baggage_authorization_requests';
    RAISE NOTICE '========================================';
END $$;
