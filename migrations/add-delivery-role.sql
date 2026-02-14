-- ========================================
-- Migration: Ajouter le rôle DELIVERY
-- Date: 2026-02-13
-- Description: Ajoute le rôle 'delivery' pour confirmer la livraison des bagages
-- ========================================

-- Mettre à jour la contrainte de rôle dans la table users
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('checkin', 'baggage', 'boarding', 'arrival', 'supervisor', 'baggage_dispute', 'support', 'rush', 'delivery'));

-- Mettre à jour la contrainte de rôle dans la table user_registration_requests
ALTER TABLE user_registration_requests DROP CONSTRAINT IF EXISTS user_registration_requests_role_check;
ALTER TABLE user_registration_requests ADD CONSTRAINT user_registration_requests_role_check 
  CHECK (role IN ('checkin', 'baggage', 'boarding', 'arrival', 'supervisor', 'baggage_dispute', 'support', 'rush', 'delivery'));

-- Politiques RLS pour les agents DELIVERY sur les bagages (accès en lecture/écriture pour leur aéroport)
DROP POLICY IF EXISTS delivery_agents_baggage_policy ON baggages;
CREATE POLICY delivery_agents_baggage_policy ON baggages
    FOR ALL
    TO authenticated
    USING (
        (auth.uid() IN (
            SELECT id FROM users 
            WHERE role = 'delivery' 
            AND airport_code = baggages.current_location
        ))
        OR
        (auth.uid() IN (
            SELECT id FROM users 
            WHERE role IN ('supervisor', 'support')
        ))
    );

-- Vérifier que la migration s'est bien déroulée
SELECT 'Migration DELIVERY role ajoutée avec succès' AS status;
