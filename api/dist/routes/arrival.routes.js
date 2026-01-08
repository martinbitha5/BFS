"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const airport_restriction_middleware_1 = require("../middleware/airport-restriction.middleware");
const arrival_validation_middleware_1 = require("../middleware/arrival-validation.middleware");
const router = (0, express_1.Router)();
/**
 * POST /api/v1/arrival/scan
 * Scanner un bagage à l'arrivée
 */
router.post('/scan', airport_restriction_middleware_1.requireAirportCode, arrival_validation_middleware_1.validateArrivalScan, async (req, res, next) => {
    try {
        const { tag_number, validated, passenger_id } = req.body;
        const airport_code = req.userAirportCode;
        // Si le bagage a été pré-validé par le middleware
        if (validated && passenger_id) {
            // Mettre à jour le statut du bagage
            const { error: updateError } = await database_1.supabase
                .from('baggages')
                .update({
                status: 'arrived',
                arrived_at: new Date().toISOString(),
                arrived_by: req.user?.id
            })
                .eq('tag_number', tag_number);
            if (updateError)
                throw updateError;
            return res.json({
                success: true,
                message: 'Bagage marqué comme arrivé'
            });
        }
        // Sinon, continuer avec la logique standard...
        // [Votre logique existante ici]
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
