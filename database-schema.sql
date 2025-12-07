-- ========================================
-- BFS - Baggage Found Solution
-- Schéma de base de données complet
-- ========================================

-- Table users (Agents et Superviseurs)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  airport_code TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('checkin', 'baggage', 'boarding', 'arrival', 'supervisor')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour recherche rapide par aéroport et rôle
CREATE INDEX idx_users_airport_code ON users(airport_code);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_airport_role ON users(airport_code, role);

-- Fonction de mise à jour automatique du champ updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour automatiquement updated_at
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- Table passengers (Passagers)
-- ========================================
CREATE TABLE passengers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  pnr TEXT,
  flight_number TEXT,
  seat_number TEXT,
  class TEXT,
  departure TEXT NOT NULL,
  arrival TEXT NOT NULL,
  airport_code TEXT NOT NULL,
  checked_in BOOLEAN DEFAULT false,
  checked_in_at TIMESTAMP WITH TIME ZONE,
  checked_in_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour recherches fréquentes
CREATE INDEX idx_passengers_airport_code ON passengers(airport_code);
CREATE INDEX idx_passengers_flight_number ON passengers(flight_number);
CREATE INDEX idx_passengers_pnr ON passengers(pnr);
CREATE INDEX idx_passengers_departure ON passengers(departure);
CREATE INDEX idx_passengers_arrival ON passengers(arrival);

CREATE TRIGGER update_passengers_updated_at
BEFORE UPDATE ON passengers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- Table baggages (Bagages nationaux)
-- ========================================
CREATE TABLE baggages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_number TEXT UNIQUE NOT NULL,
  passenger_id UUID REFERENCES passengers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'checked' CHECK (status IN ('checked', 'loaded', 'in_transit', 'arrived', 'delivered', 'rush', 'lost')),
  weight NUMERIC,
  flight_number TEXT,
  airport_code TEXT NOT NULL,
  current_location TEXT,
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  checked_by UUID REFERENCES users(id),
  arrived_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  last_scanned_at TIMESTAMP WITH TIME ZONE,
  last_scanned_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour traçabilité et recherche
CREATE INDEX idx_baggages_tag_number ON baggages(tag_number);
CREATE INDEX idx_baggages_passenger_id ON baggages(passenger_id);
CREATE INDEX idx_baggages_status ON baggages(status);
CREATE INDEX idx_baggages_airport_code ON baggages(airport_code);
CREATE INDEX idx_baggages_flight_number ON baggages(flight_number);

CREATE TRIGGER update_baggages_updated_at
BEFORE UPDATE ON baggages
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- Table international_baggages (Bagages internationaux)
-- ========================================
CREATE TABLE international_baggages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfid_tag TEXT NOT NULL,
  airport_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scanned' CHECK (status IN ('scanned', 'reconciled', 'unmatched', 'rush', 'pending')),
  flight_number TEXT,
  passenger_name TEXT,
  pnr TEXT,
  weight NUMERIC,
  remarks TEXT,
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scanned_by UUID REFERENCES users(id),
  reconciled_at TIMESTAMP WITH TIME ZONE,
  birs_report_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour recherches BIRS
CREATE INDEX idx_international_baggages_airport_code ON international_baggages(airport_code);
CREATE INDEX idx_international_baggages_rfid_tag ON international_baggages(rfid_tag);
CREATE INDEX idx_international_baggages_status ON international_baggages(status);
CREATE INDEX idx_international_baggages_pnr ON international_baggages(pnr);

CREATE TRIGGER update_international_baggages_updated_at
BEFORE UPDATE ON international_baggages
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- Table boarding_status (Statuts d'embarquement)
-- ========================================
CREATE TABLE boarding_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id UUID UNIQUE NOT NULL REFERENCES passengers(id) ON DELETE CASCADE,
  boarded BOOLEAN DEFAULT false,
  boarded_at TIMESTAMP WITH TIME ZONE,
  boarded_by UUID REFERENCES users(id),
  gate TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour vérifications rapides
CREATE INDEX idx_boarding_status_passenger_id ON boarding_status(passenger_id);
CREATE INDEX idx_boarding_status_boarded ON boarding_status(boarded);

CREATE TRIGGER update_boarding_status_updated_at
BEFORE UPDATE ON boarding_status
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- Table birs_reports (Rapports BIRS)
-- ========================================
CREATE TABLE birs_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL,
  flight_number TEXT NOT NULL,
  flight_date DATE,
  origin TEXT,
  destination TEXT,
  airline TEXT,
  airline_code TEXT,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by UUID REFERENCES users(id),
  airport_code TEXT NOT NULL,
  total_baggages INTEGER DEFAULT 0,
  reconciled_count INTEGER DEFAULT 0,
  unmatched_count INTEGER DEFAULT 0,
  processed_at TIMESTAMP WITH TIME ZONE,
  raw_data JSONB,
  synced BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour rapports
CREATE INDEX idx_birs_reports_airport_code ON birs_reports(airport_code);
CREATE INDEX idx_birs_reports_flight_number ON birs_reports(flight_number);
CREATE INDEX idx_birs_reports_flight_date ON birs_reports(flight_date);
CREATE INDEX idx_birs_reports_uploaded_at ON birs_reports(uploaded_at);

-- ========================================
-- Table birs_report_items (Items des rapports BIRS)
-- ========================================
CREATE TABLE birs_report_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  birs_report_id UUID NOT NULL REFERENCES birs_reports(id) ON DELETE CASCADE,
  bag_id TEXT,
  passenger_name TEXT,
  pnr TEXT,
  seat_number TEXT,
  class TEXT,
  psn TEXT,
  weight NUMERIC,
  route TEXT,
  categories TEXT,
  loaded TEXT,
  received TEXT,
  international_baggage_id UUID REFERENCES international_baggages(id),
  reconciled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour réconciliation
CREATE INDEX idx_birs_report_items_report_id ON birs_report_items(birs_report_id);
CREATE INDEX idx_birs_report_items_bag_id ON birs_report_items(bag_id);
CREATE INDEX idx_birs_report_items_pnr ON birs_report_items(pnr);

-- ========================================
-- Politiques de sécurité RLS (Row Level Security)
-- ========================================

-- Activer RLS sur toutes les tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE baggages ENABLE ROW LEVEL SECURITY;
ALTER TABLE international_baggages ENABLE ROW LEVEL SECURITY;
ALTER TABLE boarding_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE birs_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE birs_report_items ENABLE ROW LEVEL SECURITY;

-- Politique users : Les utilisateurs peuvent voir leur propre profil
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
USING (auth.uid() = id);

-- Politique users : Les utilisateurs peuvent mettre à jour leur propre profil
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (auth.uid() = id);

-- Politique users : Les superviseurs peuvent voir tous les utilisateurs de leur aéroport
CREATE POLICY "Supervisors can view airport users"
ON users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'supervisor'
    AND u.airport_code = users.airport_code
  )
);

-- Politique passengers : Les agents peuvent voir les passagers de leur aéroport
CREATE POLICY "Users can view airport passengers"
ON passengers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.airport_code = passengers.airport_code
  )
);

-- Politique passengers : Les agents peuvent créer des passagers
CREATE POLICY "Users can create passengers"
ON passengers FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.airport_code = passengers.airport_code
    AND u.role IN ('checkin', 'supervisor')
  )
);

-- Politique passengers : Les agents peuvent mettre à jour les passagers
CREATE POLICY "Users can update passengers"
ON passengers FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.airport_code = passengers.airport_code
  )
);

-- Politique baggages : Les agents peuvent voir les bagages de leur aéroport
CREATE POLICY "Users can view airport baggages"
ON baggages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.airport_code = baggages.airport_code
  )
);

-- Politique baggages : Les agents bagages peuvent créer et modifier des bagages
CREATE POLICY "Baggage agents can manage baggages"
ON baggages FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.airport_code = baggages.airport_code
    AND u.role IN ('baggage', 'checkin', 'supervisor')
  )
);

-- Politique international_baggages : Les agents peuvent voir les bagages internationaux de leur aéroport
CREATE POLICY "Users can view airport international baggages"
ON international_baggages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.airport_code = international_baggages.airport_code
  )
);

-- Politique international_baggages : Les agents peuvent gérer les bagages internationaux
CREATE POLICY "Users can manage international baggages"
ON international_baggages FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.airport_code = international_baggages.airport_code
  )
);

-- Politique boarding_status : Les agents peuvent voir tous les statuts
CREATE POLICY "Users can view boarding statuses"
ON boarding_status FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN passengers p ON p.airport_code = u.airport_code
    WHERE u.id = auth.uid()
    AND p.id = boarding_status.passenger_id
  )
);

-- Politique boarding_status : Les agents boarding peuvent gérer les embarquements
CREATE POLICY "Boarding agents can manage boarding"
ON boarding_status FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN passengers p ON p.airport_code = u.airport_code
    WHERE u.id = auth.uid()
    AND u.role IN ('boarding', 'supervisor')
    AND p.id = boarding_status.passenger_id
  )
);

-- Politique birs_reports : Les agents peuvent voir les rapports de leur aéroport
CREATE POLICY "Users can view airport birs reports"
ON birs_reports FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.airport_code = birs_reports.airport_code
  )
);

-- Politique birs_reports : Les superviseurs peuvent créer des rapports
CREATE POLICY "Supervisors can create birs reports"
ON birs_reports FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.airport_code = birs_reports.airport_code
    AND u.role = 'supervisor'
  )
);

-- Politique birs_report_items : Accès basé sur le rapport parent
CREATE POLICY "Users can view birs report items"
ON birs_report_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN birs_reports r ON r.id = birs_report_items.birs_report_id
    WHERE u.id = auth.uid()
    AND u.airport_code = r.airport_code
  )
);

-- ========================================
-- Vues utiles pour les statistiques
-- ========================================

-- Vue pour les statistiques des agents
CREATE OR REPLACE VIEW user_statistics AS
SELECT 
  u.id,
  u.full_name,
  u.role,
  u.airport_code,
  COUNT(DISTINCT p.id) as passengers_processed,
  COUNT(DISTINCT b.id) as baggages_processed,
  COUNT(DISTINCT bs.id) as boardings_processed
FROM users u
LEFT JOIN passengers p ON p.checked_in_by = u.id
LEFT JOIN baggages b ON b.checked_by = u.id
LEFT JOIN boarding_status bs ON bs.boarded_by = u.id
GROUP BY u.id, u.full_name, u.role, u.airport_code;

-- Vue pour les statistiques par aéroport
CREATE OR REPLACE VIEW airport_statistics AS
SELECT 
  airport_code,
  COUNT(DISTINCT CASE WHEN role = 'checkin' THEN id END) as checkin_agents,
  COUNT(DISTINCT CASE WHEN role = 'baggage' THEN id END) as baggage_agents,
  COUNT(DISTINCT CASE WHEN role = 'boarding' THEN id END) as boarding_agents,
  COUNT(DISTINCT CASE WHEN role = 'arrival' THEN id END) as arrival_agents,
  COUNT(DISTINCT CASE WHEN role = 'supervisor' THEN id END) as supervisors
FROM users
GROUP BY airport_code;

-- ========================================
-- Commentaires pour documentation
-- ========================================

COMMENT ON TABLE users IS 'Agents et superviseurs du système BFS';
COMMENT ON COLUMN users.role IS 'Rôle: checkin, baggage, boarding, arrival, supervisor';
COMMENT ON TABLE passengers IS 'Passagers enregistrés dans le système';
COMMENT ON TABLE baggages IS 'Bagages nationaux avec traçabilité complète';
COMMENT ON TABLE international_baggages IS 'Bagages internationaux avec réconciliation BIRS';
COMMENT ON TABLE boarding_status IS 'Statuts d''embarquement des passagers';
COMMENT ON TABLE birs_reports IS 'Rapports BIRS uploadés';
COMMENT ON TABLE birs_report_items IS 'Items individuels des rapports BIRS';
