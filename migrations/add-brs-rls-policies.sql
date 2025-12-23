-- ========================================
-- Migration: Politiques RLS pour les tables BRS
-- Restrictions d'accès par aéroport
-- ========================================

-- Activer RLS sur les nouvelles tables BRS
ALTER TABLE brs_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE brs_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE brs_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE brs_notifications ENABLE ROW LEVEL SECURITY;

-- ========================================
-- Politiques pour brs_exceptions
-- ========================================

-- Les utilisateurs peuvent voir les exceptions de leur aéroport
CREATE POLICY "Users can view airport brs exceptions"
ON brs_exceptions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.airport_code = brs_exceptions.airport_code
  )
);

-- Les utilisateurs peuvent créer des exceptions pour leur aéroport
CREATE POLICY "Users can create airport brs exceptions"
ON brs_exceptions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.airport_code = brs_exceptions.airport_code
  )
);

-- Les utilisateurs peuvent mettre à jour les exceptions de leur aéroport
CREATE POLICY "Users can update airport brs exceptions"
ON brs_exceptions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.airport_code = brs_exceptions.airport_code
  )
);

-- ========================================
-- Politiques pour brs_workflow_steps
-- ========================================

-- Les utilisateurs peuvent voir les étapes de workflow des rapports de leur aéroport
CREATE POLICY "Users can view airport brs workflow steps"
ON brs_workflow_steps FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN birs_reports r ON r.id = brs_workflow_steps.report_id
    WHERE u.id = auth.uid()
    AND u.airport_code = r.airport_code
  )
);

-- Les utilisateurs peuvent créer des étapes pour les rapports de leur aéroport
CREATE POLICY "Users can create airport brs workflow steps"
ON brs_workflow_steps FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    JOIN birs_reports r ON r.id = brs_workflow_steps.report_id
    WHERE u.id = auth.uid()
    AND u.airport_code = r.airport_code
  )
);

-- ========================================
-- Politiques pour brs_transfers
-- ========================================

-- Les utilisateurs peuvent voir les transferts de leur aéroport
CREATE POLICY "Users can view airport brs transfers"
ON brs_transfers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND (
      u.airport_code = brs_transfers.from_airport_code
      OR u.airport_code = brs_transfers.to_airport_code
      OR u.airport_code = brs_transfers.transfer_airport_code
    )
  )
);

-- Les utilisateurs peuvent créer des transferts pour leur aéroport
CREATE POLICY "Users can create airport brs transfers"
ON brs_transfers FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND (
      u.airport_code = brs_transfers.from_airport_code
      OR u.airport_code = brs_transfers.transfer_airport_code
    )
  )
);

-- Les utilisateurs peuvent mettre à jour les transferts de leur aéroport
CREATE POLICY "Users can update airport brs transfers"
ON brs_transfers FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND (
      u.airport_code = brs_transfers.from_airport_code
      OR u.airport_code = brs_transfers.transfer_airport_code
    )
  )
);

-- ========================================
-- Politiques pour brs_notifications
-- ========================================

-- Les utilisateurs peuvent voir leurs notifications ou celles de leur aéroport
CREATE POLICY "Users can view airport brs notifications"
ON brs_notifications FOR SELECT
USING (
  brs_notifications.user_id = auth.uid()
  OR (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.airport_code = brs_notifications.airport_code
      AND (brs_notifications.role IS NULL OR brs_notifications.role = u.role)
    )
  )
);

-- Les utilisateurs peuvent créer des notifications pour leur aéroport
CREATE POLICY "Users can create airport brs notifications"
ON brs_notifications FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.airport_code = brs_notifications.airport_code
  )
);

-- Les utilisateurs peuvent mettre à jour leurs notifications
CREATE POLICY "Users can update own brs notifications"
ON brs_notifications FOR UPDATE
USING (
  brs_notifications.user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.airport_code = brs_notifications.airport_code
    AND u.role = 'supervisor'
  )
);

-- ========================================
-- Améliorer les politiques flight_schedule
-- ========================================

-- Les utilisateurs peuvent voir les vols de leur aéroport
DROP POLICY IF EXISTS flight_schedule_select_policy ON flight_schedule;
CREATE POLICY flight_schedule_select_policy ON flight_schedule
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (
      -- Vols de leur aéroport
      flight_schedule.airport_code IN (
        SELECT airport_code FROM users WHERE id = auth.uid()
      )
      -- Ou vols où leur aéroport est départ/arrivée
      OR flight_schedule.departure IN (
        SELECT airport_code FROM users WHERE id = auth.uid()
      )
      OR flight_schedule.arrival IN (
        SELECT airport_code FROM users WHERE id = auth.uid()
      )
    )
  );

-- Commentaires
COMMENT ON POLICY "Users can view airport brs exceptions" ON brs_exceptions IS 
'Les utilisateurs ne peuvent voir que les exceptions de leur aéroport';
COMMENT ON POLICY "Users can view airport brs workflow steps" ON brs_workflow_steps IS 
'Les utilisateurs ne peuvent voir que les étapes de workflow des rapports de leur aéroport';
COMMENT ON POLICY "Users can view airport brs transfers" ON brs_transfers IS 
'Les utilisateurs peuvent voir les transferts impliquant leur aéroport';
COMMENT ON POLICY "Users can view airport brs notifications" ON brs_notifications IS 
'Les utilisateurs peuvent voir leurs notifications ou celles de leur aéroport/rôle';

