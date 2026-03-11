"use strict";
/**
 * Mapping BagJourney (SITA) → BFS
 * Codes BagJourney: BAGJOURNEY_INTEGRATION.md
 * Statuts BFS: checked, loaded, in_transit, arrived, delivered, rush, lost
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BFS_STATUSES = void 0;
exports.mapBagJourneyStatusToBFS = mapBagJourneyStatusToBFS;
exports.BFS_STATUSES = [
    'checked',
    'loaded',
    'in_transit',
    'arrived',
    'delivered',
    'rush',
    'lost',
];
const BAGJOURNEY_TO_BFS = {
    CHECKED_IN: 'checked',
    PAX_BOARDED: 'checked',
    SCREENED: 'checked',
    SCREENING_PASSED: 'checked',
    SCREENING_FAILED: 'rush',
    SORTED: 'checked',
    LOADED_IN_CONTAINER: 'loaded',
    LOADED_ON_AIRCRAFT: 'loaded',
    NAL: 'loaded',
    OFFLOADED: 'rush',
    EXPECTED: 'arrived',
    REROUTED: 'rush',
    REFLIGHTED: 'rush',
    CANCELLED: 'lost',
    MISHANDLED: 'lost',
    ONA: 'in_transit',
    OND: 'rush',
    UNS: 'checked',
};
function mapBagJourneyStatusToBFS(bagJourneyCode) {
    const normalized = (bagJourneyCode || '').trim().toUpperCase();
    return BAGJOURNEY_TO_BFS[normalized] ?? 'checked';
}
