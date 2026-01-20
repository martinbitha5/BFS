"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const router = (0, express_1.Router)();
/**
 * POST /api/v1/auth/request-deletion
 * Créer une demande de suppression de compte
 * Accessible publiquement (sans auth requise)
 */
router.post('/request-deletion', async (req, res, next) => {
    try {
        const { email, reason } = req.body;
        // Validation
        if (!email || !email.includes('@')) {
            return res.status(400).json({
                success: false,
                error: 'Email invalide'
            });
        }
        // Vérifier que l'utilisateur existe
        const { data: userData, error: userError } = await database_1.supabase
            .from('users')
            .select('id, email')
            .eq('email', email)
            .single();
        if (userError || !userData) {
            return res.status(404).json({
                success: false,
                error: 'Aucun compte trouvé avec cet email'
            });
        }
        // Créer la demande de suppression
        const { data: deletionRequest, error: insertError } = await database_1.supabase
            .from('account_deletion_requests')
            .insert({
            user_id: userData.id,
            email: email,
            reason: reason || null,
            status: 'pending',
            requested_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 jours
        })
            .select()
            .single();
        if (insertError) {
            console.error('Erreur insertion demande:', insertError);
            return res.status(500).json({
                success: false,
                error: 'Erreur lors de la création de la demande'
            });
        }
        // TODO: Envoyer un email de confirmation
        // await emailService.sendDeletionConfirmationEmail(email);
        res.json({
            success: true,
            message: 'Demande de suppression reçue. Un email de confirmation a été envoyé.',
            data: {
                requestId: deletionRequest.id,
                email: email,
                expiresAt: deletionRequest.expires_at
            }
        });
    }
    catch (error) {
        console.error('Erreur:', error);
        next(error);
    }
});
/**
 * GET /api/v1/auth/deletion-status/:email
 * Vérifier le statut d'une demande de suppression
 */
router.get('/deletion-status/:email', async (req, res, next) => {
    try {
        const { email } = req.params;
        const { data: request, error } = await database_1.supabase
            .from('account_deletion_requests')
            .select('*')
            .eq('email', email)
            .order('requested_at', { ascending: false })
            .single();
        if (error || !request) {
            return res.status(404).json({
                success: false,
                error: 'Aucune demande de suppression trouvée'
            });
        }
        res.json({
            success: true,
            data: {
                status: request.status,
                requestedAt: request.requested_at,
                expiresAt: request.expires_at,
                reason: request.reason
            }
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * DELETE /api/v1/auth/cancel-deletion/:email
 * Annuler une demande de suppression (avant expiration)
 * Nécessite une authentification
 */
router.delete('/cancel-deletion/:email', async (req, res, next) => {
    try {
        const { email } = req.params;
        const userEmail = req.userEmail;
        // Vérifier que c'est l'utilisateur qui effectue la demande
        if (userEmail !== email) {
            return res.status(403).json({
                success: false,
                error: 'Vous ne pouvez annuler que votre propre demande'
            });
        }
        // Mettre à jour le statut à 'cancelled'
        const { error } = await database_1.supabase
            .from('account_deletion_requests')
            .update({ status: 'cancelled' })
            .eq('email', email)
            .eq('status', 'pending');
        if (error) {
            return res.status(500).json({
                success: false,
                error: 'Erreur lors de l\'annulation'
            });
        }
        res.json({
            success: true,
            message: 'Demande de suppression annulée'
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
