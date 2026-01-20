"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const airport_restriction_middleware_1 = require("../middleware/airport-restriction.middleware");
const router = (0, express_1.Router)();
/**
 * POST /api/v1/support/baggages/create
 * SUPPORT ONLY: Créer un bagage supplémentaire pour un passager
 */
router.post('/baggages/create', airport_restriction_middleware_1.requireAirportCode, async (req, res, next) => {
    try {
        const userRole = req.userRole || req.headers['x-user-role'];
        if (userRole !== 'support') {
            return res.status(403).json({
                success: false,
                error: 'Accès refusé. Cette route est réservée au support.'
            });
        }
        const { passengerId, tag_number, weight, status } = req.body;
        if (!passengerId || !tag_number) {
            return res.status(400).json({
                success: false,
                error: 'passengerId et tag_number sont requis'
            });
        }
        // Vérifier que le passager existe
        const { data: passenger, error: passengerError } = await database_1.supabase
            .from('passengers')
            .select('id, full_name, airport_code')
            .eq('id', passengerId)
            .single();
        if (passengerError || !passenger) {
            return res.status(404).json({
                success: false,
                error: 'Passager non trouvé'
            });
        }
        // Créer le bagage
        const { data: baggage, error: baggageError } = await database_1.supabase
            .from('baggages')
            .insert({
            passenger_id: passengerId,
            tag_number: tag_number,
            weight: weight || null,
            status: status || 'checked_in',
            checked_at: new Date().toISOString(),
            airport_code: passenger.airport_code
        })
            .select()
            .single();
        if (baggageError) {
            throw baggageError;
        }
        console.log(`[Support] Bagage créé pour ${passenger.full_name}: ${tag_number}`);
        res.json({
            success: true,
            data: {
                id: baggage.id,
                tag_number: baggage.tag_number,
                status: baggage.status,
                weight: baggage.weight,
                checked_at: baggage.checked_at
            }
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * DELETE /api/v1/support/baggages/:id
 * SUPPORT ONLY: Supprimer un bagage
 */
router.delete('/baggages/:id', airport_restriction_middleware_1.requireAirportCode, async (req, res, next) => {
    try {
        const userRole = req.userRole || req.headers['x-user-role'];
        if (userRole !== 'support') {
            return res.status(403).json({
                success: false,
                error: 'Accès refusé. Cette route est réservée au support.'
            });
        }
        const { id } = req.params;
        // Vérifier que le bagage existe
        const { data: baggage, error: fetchError } = await database_1.supabase
            .from('baggages')
            .select('id, tag_number, passenger_id')
            .eq('id', id)
            .single();
        if (fetchError || !baggage) {
            return res.status(404).json({
                success: false,
                error: 'Bagage non trouvé'
            });
        }
        // Supprimer le bagage
        const { error: deleteError } = await database_1.supabase
            .from('baggages')
            .delete()
            .eq('id', id);
        if (deleteError) {
            throw deleteError;
        }
        console.log(`[Support] Bagage supprimé: ${baggage.tag_number}`);
        res.json({
            success: true,
            message: 'Bagage supprimé avec succès'
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * PUT /api/v1/support/baggages/:id
 * SUPPORT ONLY: Mettre à jour un bagage
 */
router.put('/baggages/:id', airport_restriction_middleware_1.requireAirportCode, async (req, res, next) => {
    try {
        const userRole = req.userRole || req.headers['x-user-role'];
        if (userRole !== 'support') {
            return res.status(403).json({
                success: false,
                error: 'Accès refusé. Cette route est réservée au support.'
            });
        }
        const { id } = req.params;
        const { tag_number, weight, status } = req.body;
        // Vérifier que le bagage existe
        const { data: baggage, error: fetchError } = await database_1.supabase
            .from('baggages')
            .select('id')
            .eq('id', id)
            .single();
        if (fetchError || !baggage) {
            return res.status(404).json({
                success: false,
                error: 'Bagage non trouvé'
            });
        }
        // Préparer les mises à jour
        const updates = {};
        if (tag_number !== undefined)
            updates.tag_number = tag_number;
        if (weight !== undefined)
            updates.weight = weight;
        if (status !== undefined)
            updates.status = status;
        // Mettre à jour
        const { data: updated, error: updateError } = await database_1.supabase
            .from('baggages')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (updateError) {
            throw updateError;
        }
        console.log(`[Support] Bagage mis à jour: ${id}`);
        res.json({
            success: true,
            data: updated
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/users/all
 * SUPPORT ONLY: Récupérer TOUS les utilisateurs
 */
router.get('/users/all', airport_restriction_middleware_1.requireAirportCode, async (req, res, next) => {
    try {
        const userRole = req.userRole || req.headers['x-user-role'];
        if (userRole !== 'support') {
            return res.status(403).json({
                success: false,
                error: 'Accès refusé. Cette route est réservée au support.'
            });
        }
        const { data, error } = await database_1.supabase
            .from('users')
            .select('id, email, full_name, airport_code, role, created_at, updated_at')
            .order('created_at', { ascending: false });
        if (error) {
            throw error;
        }
        res.json({
            success: true,
            data: data || []
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * DELETE /api/v1/support/users/:id
 * SUPPORT ONLY: Supprimer un utilisateur
 */
router.delete('/users/:id', airport_restriction_middleware_1.requireAirportCode, async (req, res, next) => {
    try {
        const userRole = req.userRole || req.headers['x-user-role'];
        if (userRole !== 'support') {
            return res.status(403).json({
                success: false,
                error: 'Accès refusé. Cette route est réservée au support.'
            });
        }
        const { id } = req.params;
        const currentUser = req.user;
        // Vérifier qu'on n'essaie pas de supprimer soi-même
        if (currentUser?.id === id) {
            return res.status(400).json({
                success: false,
                error: 'Vous ne pouvez pas supprimer votre propre compte'
            });
        }
        // Vérifier que l'utilisateur existe
        const { data: user, error: fetchError } = await database_1.supabase
            .from('users')
            .select('id, full_name')
            .eq('id', id)
            .single();
        if (fetchError || !user) {
            return res.status(404).json({
                success: false,
                error: 'Utilisateur non trouvé'
            });
        }
        // Supprimer l'utilisateur
        const { error: deleteError } = await database_1.supabase
            .from('users')
            .delete()
            .eq('id', id);
        if (deleteError) {
            throw deleteError;
        }
        console.log(`[Support] Utilisateur supprimé: ${user.full_name}`);
        res.json({
            success: true,
            message: 'Utilisateur supprimé avec succès'
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/support/stats
 * SUPPORT ONLY: Statistiques complètes du système
 */
router.get('/stats', airport_restriction_middleware_1.requireAirportCode, async (req, res, next) => {
    try {
        const userRole = req.userRole || req.headers['x-user-role'];
        if (userRole !== 'support') {
            return res.status(403).json({
                success: false,
                error: 'Accès refusé. Cette route est réservée au support.'
            });
        }
        // Compter les entités
        const [{ count: passengerCount }, { count: baggageCount }, { count: userCount }, { count: boardingCount }] = await Promise.all([
            database_1.supabase.from('passengers').select('id', { count: 'exact' }),
            database_1.supabase.from('baggages').select('id', { count: 'exact' }),
            database_1.supabase.from('users').select('id', { count: 'exact' }),
            database_1.supabase.from('boarding_status').select('id', { count: 'exact' })
        ]);
        res.json({
            success: true,
            data: {
                passengers: passengerCount || 0,
                baggages: baggageCount || 0,
                users: userCount || 0,
                boardingStatus: boardingCount || 0,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
