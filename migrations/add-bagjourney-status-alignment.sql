-- ========================================
-- Migration: Alignement des statuts BagJourney (SITA) avec BFS
-- Date: 2025-02-27
-- Description: Documente le mapping BagJourney → BFS et ajoute une colonne
--              optionnelle pour tracer le code source BagJourney
-- Référence: api/src/utils/bagjourney-status.util.ts
-- ========================================

-- Statuts BFS (inchangés): checked, loaded, in_transit, arrived, delivered, rush, lost
-- Mapping BagJourney → BFS:
--   checked: CHECKED_IN, PAX_BOARDED, SCREENED, SCREENING_PASSED, SORTED, UNS
--   loaded:  LOADED_IN_CONTAINER, LOADED_ON_AIRCRAFT, NAL
--   in_transit: ONA
--   arrived: EXPECTED
--   rush: OFFLOADED, REROUTED, REFLIGHTED, SCREENING_FAILED, OND
--   lost: CANCELLED, MISHANDLED

-- Colonne optionnelle pour tracer le code BagJourney source (quand données via BagJourney)
ALTER TABLE baggages ADD COLUMN IF NOT EXISTS bagjourney_status TEXT;

COMMENT ON COLUMN baggages.bagjourney_status IS 'Code statut BagJourney (SITA) source, quand les données proviennent de BagJourney. NULL = données BFS locales uniquement.';

CREATE INDEX IF NOT EXISTS idx_baggages_bagjourney_status ON baggages(bagjourney_status) WHERE bagjourney_status IS NOT NULL;
