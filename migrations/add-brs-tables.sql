-- ========================================
-- Migration: Tables BRS Complètes
-- Ajout des tables pour exceptions et workflow
-- ========================================

-- Table brs_exceptions - Gestion des exceptions BRS
CREATE TABLE IF NOT EXISTS brs_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('missing_baggage', 'rush', 'transfer', 'damaged', 'overweight', 'security', 'delay', 'mismatch')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed', 'escalated')),
  
  -- Références
  baggage_id UUID REFERENCES international_baggages(id) ON DELETE SET NULL,
  report_id UUID REFERENCES birs_reports(id) ON DELETE SET NULL,
  report_item_id UUID REFERENCES birs_report_items(id) ON DELETE SET NULL,
  
  -- Informations
  flight_number TEXT NOT NULL,
  airport_code TEXT NOT NULL,
  description TEXT NOT NULL,
  details JSONB,
  
  -- Transfert (si applicable)
  transfer_from_flight TEXT,
  transfer_to_flight TEXT,
  transfer_airport TEXT,
  
  -- Résolution
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES users(id),
  resolution_notes TEXT,
  escalation_reason TEXT,
  
  -- Métadonnées
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID REFERENCES users(id),
  tags TEXT[],
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour brs_exceptions
CREATE INDEX IF NOT EXISTS idx_brs_exceptions_status ON brs_exceptions(status);
CREATE INDEX IF NOT EXISTS idx_brs_exceptions_type ON brs_exceptions(type);
CREATE INDEX IF NOT EXISTS idx_brs_exceptions_severity ON brs_exceptions(severity);
CREATE INDEX IF NOT EXISTS idx_brs_exceptions_airport ON brs_exceptions(airport_code);
CREATE INDEX IF NOT EXISTS idx_brs_exceptions_flight ON brs_exceptions(flight_number);
CREATE INDEX IF NOT EXISTS idx_brs_exceptions_baggage ON brs_exceptions(baggage_id);
CREATE INDEX IF NOT EXISTS idx_brs_exceptions_report ON brs_exceptions(report_id);
CREATE INDEX IF NOT EXISTS idx_brs_exceptions_created_at ON brs_exceptions(created_at);

-- Table brs_workflow_steps - Historique des étapes du workflow
CREATE TABLE IF NOT EXISTS brs_workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES birs_reports(id) ON DELETE CASCADE,
  
  -- Étape
  step TEXT NOT NULL CHECK (step IN ('upload', 'validation', 'reconciliation', 'verification', 'closure', 'reopen')),
  step_order INTEGER NOT NULL,
  
  -- Statut
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'skipped')),
  
  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  
  -- Utilisateur
  performed_by UUID REFERENCES users(id),
  
  -- Détails
  notes TEXT,
  error_message TEXT,
  metadata JSONB,
  
  -- Métriques
  items_processed INTEGER DEFAULT 0,
  items_success INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour brs_workflow_steps
CREATE INDEX IF NOT EXISTS idx_brs_workflow_steps_report ON brs_workflow_steps(report_id);
CREATE INDEX IF NOT EXISTS idx_brs_workflow_steps_step ON brs_workflow_steps(step);
CREATE INDEX IF NOT EXISTS idx_brs_workflow_steps_status ON brs_workflow_steps(status);
CREATE INDEX IF NOT EXISTS idx_brs_workflow_steps_created_at ON brs_workflow_steps(created_at);

-- Table brs_transfers - Gestion des transferts de bagages
CREATE TABLE IF NOT EXISTS brs_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Bagage
  baggage_id UUID NOT NULL REFERENCES international_baggages(id) ON DELETE CASCADE,
  
  -- Vols
  from_flight_number TEXT NOT NULL,
  from_airport_code TEXT NOT NULL,
  to_flight_number TEXT NOT NULL,
  to_airport_code TEXT NOT NULL,
  
  -- Statut
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'transferred', 'failed', 'cancelled')),
  
  -- Informations
  transfer_type TEXT CHECK (transfer_type IN ('connection', 'reroute', 'rush', 'manual')),
  connection_time_minutes INTEGER,
  transfer_airport_code TEXT,
  
  -- Timestamps
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  transferred_at TIMESTAMP WITH TIME ZONE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  
  -- Utilisateurs
  requested_by UUID REFERENCES users(id),
  transferred_by UUID REFERENCES users(id),
  confirmed_by UUID REFERENCES users(id),
  
  -- Détails
  notes TEXT,
  reason TEXT,
  metadata JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour brs_transfers
CREATE INDEX IF NOT EXISTS idx_brs_transfers_baggage ON brs_transfers(baggage_id);
CREATE INDEX IF NOT EXISTS idx_brs_transfers_status ON brs_transfers(status);
CREATE INDEX IF NOT EXISTS idx_brs_transfers_from_flight ON brs_transfers(from_flight_number);
CREATE INDEX IF NOT EXISTS idx_brs_transfers_to_flight ON brs_transfers(to_flight_number);
CREATE INDEX IF NOT EXISTS idx_brs_transfers_airport ON brs_transfers(transfer_airport_code);

-- Table brs_notifications - Notifications BRS
CREATE TABLE IF NOT EXISTS brs_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Type et sévérité
  type TEXT NOT NULL CHECK (type IN ('alert', 'exception', 'workflow', 'transfer', 'sla', 'report')),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  
  -- Références
  exception_id UUID REFERENCES brs_exceptions(id) ON DELETE CASCADE,
  report_id UUID REFERENCES birs_reports(id) ON DELETE CASCADE,
  transfer_id UUID REFERENCES brs_transfers(id) ON DELETE CASCADE,
  
  -- Destinataire
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  airport_code TEXT NOT NULL,
  role TEXT, -- Si null, pour tous les rôles
  
  -- Contenu
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  
  -- Statut
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  
  -- Canaux
  email_sent BOOLEAN DEFAULT false,
  sms_sent BOOLEAN DEFAULT false,
  push_sent BOOLEAN DEFAULT false,
  in_app BOOLEAN DEFAULT true,
  
  -- Timestamps
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- Métadonnées
  metadata JSONB,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour brs_notifications
CREATE INDEX IF NOT EXISTS idx_brs_notifications_user ON brs_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_brs_notifications_status ON brs_notifications(status);
CREATE INDEX IF NOT EXISTS idx_brs_notifications_type ON brs_notifications(type);
CREATE INDEX IF NOT EXISTS idx_brs_notifications_airport ON brs_notifications(airport_code);
CREATE INDEX IF NOT EXISTS idx_brs_notifications_created_at ON brs_notifications(created_at);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_brs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_brs_exceptions_updated_at
BEFORE UPDATE ON brs_exceptions
FOR EACH ROW
EXECUTE FUNCTION update_brs_updated_at();

CREATE TRIGGER update_brs_transfers_updated_at
BEFORE UPDATE ON brs_transfers
FOR EACH ROW
EXECUTE FUNCTION update_brs_updated_at();

-- Commentaires pour documentation
COMMENT ON TABLE brs_exceptions IS 'Exceptions BRS avec gestion complète du cycle de vie';
COMMENT ON TABLE brs_workflow_steps IS 'Historique détaillé des étapes du workflow BRS';
COMMENT ON TABLE brs_transfers IS 'Gestion des transferts de bagages entre vols';
COMMENT ON TABLE brs_notifications IS 'Notifications BRS multi-canaux (email, SMS, push, in-app)';

