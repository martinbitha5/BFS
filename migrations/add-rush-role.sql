-- Mettre à jour la contrainte de rôle dans la table users
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('checkin', 'baggage', 'boarding', 'arrival', 'supervisor', 'baggage_dispute', 'support', 'rush'));

-- Mettre à jour la contrainte de rôle dans la table user_registration_requests
ALTER TABLE user_registration_requests DROP CONSTRAINT IF EXISTS user_registration_requests_role_check;
ALTER TABLE user_registration_requests ADD CONSTRAINT user_registration_requests_role_check 
  CHECK (role IN ('checkin', 'baggage', 'boarding', 'arrival', 'supervisor', 'baggage_dispute', 'support', 'rush'));

-- Politiques RLS pour les agents RUSH sur les bagages nationaux
DROP POLICY IF EXISTS rush_agents_baggage_policy ON baggages;
CREATE POLICY rush_agents_baggage_policy ON baggages
    FOR ALL
    TO authenticated
    USING (
        (auth.uid() IN (
            SELECT id FROM users 
            WHERE role = 'rush' 
            AND airport_code = baggages.current_location
        ))
        OR
        (auth.uid() IN (
            SELECT id FROM users 
            WHERE role IN ('supervisor', 'support')
        ))
    );

-- Politiques RLS pour les agents RUSH sur les bagages internationaux
DROP POLICY IF EXISTS rush_agents_international_policy ON international_baggages;
CREATE POLICY rush_agents_international_policy ON international_baggages
    FOR ALL
    TO authenticated
    USING (
        (auth.uid() IN (
            SELECT id FROM users 
            WHERE role = 'rush' 
            AND airport_code = international_baggages.airport_code
        ))
        OR
        (auth.uid() IN (
            SELECT id FROM users 
            WHERE role IN ('supervisor', 'support')
        ))
    );;

-- Table pour l'historique des actions RUSH
CREATE TABLE IF NOT EXISTS rush_actions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    baggage_id UUID NOT NULL,
    baggage_type VARCHAR(20) NOT NULL CHECK (baggage_type IN ('national', 'international')),
    tag_number VARCHAR(50) NOT NULL,
    reason TEXT NOT NULL,
    next_flight VARCHAR(50),
    declared_by UUID NOT NULL REFERENCES users(id),
    airport_code VARCHAR(3) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ajout des contraintes de clé étrangère avec trigger
CREATE OR REPLACE FUNCTION check_rush_baggage_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.baggage_type = 'national' THEN
        -- Vérifier que le baggage_id existe dans la table baggages
        IF NOT EXISTS (SELECT 1 FROM baggages WHERE id = NEW.baggage_id) THEN
            RAISE EXCEPTION 'Le bagage national avec ID % n''existe pas', NEW.baggage_id;
        END IF;
    ELSIF NEW.baggage_type = 'international' THEN
        -- Vérifier que le baggage_id existe dans la table international_baggages
        IF NOT EXISTS (SELECT 1 FROM international_baggages WHERE id = NEW.baggage_id) THEN
            RAISE EXCEPTION 'Le bagage international avec ID % n''existe pas', NEW.baggage_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_rush_baggage_reference_trigger
    BEFORE INSERT OR UPDATE ON rush_actions
    FOR EACH ROW
    EXECUTE FUNCTION check_rush_baggage_reference();

-- Index pour les recherches fréquentes
CREATE INDEX idx_rush_actions_baggage ON rush_actions(baggage_id);
CREATE INDEX idx_rush_actions_tag ON rush_actions(tag_number);
CREATE INDEX idx_rush_actions_airport ON rush_actions(airport_code);
CREATE INDEX idx_rush_actions_date ON rush_actions(created_at DESC);

-- Politique RLS pour rush_actions
ALTER TABLE rush_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rush_actions_policy ON rush_actions;
CREATE POLICY rush_actions_policy ON rush_actions
    FOR ALL
    TO authenticated
    USING (
        (auth.uid() IN (
            SELECT id FROM users 
            WHERE role = 'rush' 
            AND airport_code = rush_actions.airport_code
        ))
        OR
        (auth.uid() IN (
            SELECT id FROM users 
            WHERE role IN ('supervisor', 'support')
        ))
    );

-- Mise à jour de la vue des statistiques pour inclure les agents RUSH
CREATE OR REPLACE VIEW user_statistics AS
SELECT 
    u.id,
    u.full_name,
    u.role,
    u.airport_code,
    COUNT(DISTINCT p.id) as passengers_processed,
    COUNT(DISTINCT b.id) as baggages_processed,
    COUNT(DISTINCT bs.id) as boardings_processed,
    COUNT(DISTINCT ra.id) as rush_actions_processed
FROM users u
LEFT JOIN passengers p ON p.checked_in_by = u.id
LEFT JOIN baggages b ON b.checked_by = u.id
LEFT JOIN boarding_status bs ON bs.boarded_by = u.id
LEFT JOIN rush_actions ra ON ra.declared_by = u.id
GROUP BY u.id, u.full_name, u.role, u.airport_code;

-- Mise à jour de la vue des statistiques par aéroport
CREATE OR REPLACE VIEW airport_statistics AS
SELECT 
    airport_code,
    COUNT(DISTINCT CASE WHEN role = 'checkin' THEN id END) as checkin_agents,
    COUNT(DISTINCT CASE WHEN role = 'baggage' THEN id END) as baggage_agents,
    COUNT(DISTINCT CASE WHEN role = 'boarding' THEN id END) as boarding_agents,
    COUNT(DISTINCT CASE WHEN role = 'arrival' THEN id END) as arrival_agents,
    COUNT(DISTINCT CASE WHEN role = 'rush' THEN id END) as rush_agents,
    COUNT(DISTINCT CASE WHEN role = 'supervisor' THEN id END) as supervisors
FROM users
GROUP BY airport_code;

-- Commentaires pour documentation
COMMENT ON TABLE rush_actions IS 'Actions de déclaration RUSH sur les bagages nationaux et internationaux';
COMMENT ON COLUMN rush_actions.baggage_type IS 'Type de bagage: national ou international';
COMMENT ON COLUMN rush_actions.reason IS 'Raison de la déclaration RUSH';
COMMENT ON COLUMN rush_actions.next_flight IS 'Numéro du prochain vol (optionnel)';

CREATE POLICY rush_actions_policy ON rush_actions
    FOR ALL
    TO authenticated
    USING (
        (auth.uid() IN (
            SELECT id FROM users 
            WHERE role = 'rush' 
            AND airport_code = rush_actions.airport_code
        ))
        OR
        (auth.uid() IN (
            SELECT id FROM users 
            WHERE role IN ('admin', 'supervisor')
        ))
    );

-- Fonction pour déclarer un bagage en RUSH
CREATE OR REPLACE FUNCTION declare_rush_baggage(
    p_tag_number VARCHAR,
    p_reason TEXT,
    p_next_flight VARCHAR,
    p_declared_by UUID,
    p_airport_code VARCHAR
) RETURNS JSON AS $$
DECLARE
    v_baggage_id UUID;
    v_baggage_type VARCHAR;
    v_result JSON;
BEGIN
    -- Chercher d'abord dans les bagages nationaux
    SELECT id INTO v_baggage_id
    FROM baggages
    WHERE tag_number = p_tag_number;

    IF FOUND THEN
        v_baggage_type := 'national';
        
        -- Mettre à jour le statut du bagage
        UPDATE baggages
        SET 
            status = 'rush',
            last_scanned_at = NOW(),
            last_scanned_by = p_declared_by,
            current_location = p_airport_code
        WHERE id = v_baggage_id;
    ELSE
        -- Chercher dans les bagages internationaux
        SELECT id INTO v_baggage_id
        FROM international_baggages
        WHERE tag_number = p_tag_number;

        IF FOUND THEN
            v_baggage_type := 'international';
            
            -- Mettre à jour le statut du bagage
            UPDATE international_baggages
            SET 
                status = 'rush',
                last_scanned_at = NOW(),
                last_scanned_by = p_declared_by,
                current_location = p_airport_code,
                next_flight = p_next_flight
            WHERE id = v_baggage_id;
        ELSE
            RETURN json_build_object(
                'success', false,
                'error', 'Bagage non trouvé'
            );
        END IF;
    END IF;

    -- Enregistrer l'action RUSH
    INSERT INTO rush_actions (
        baggage_id,
        baggage_type,
        tag_number,
        reason,
        next_flight,
        declared_by,
        airport_code
    ) VALUES (
        v_baggage_id,
        v_baggage_type,
        p_tag_number,
        p_reason,
        p_next_flight,
        p_declared_by,
        p_airport_code
    );

    RETURN json_build_object(
        'success', true,
        'baggage_id', v_baggage_id,
        'baggage_type', v_baggage_type
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
