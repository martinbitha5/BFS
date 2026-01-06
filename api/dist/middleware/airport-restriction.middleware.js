"use strict";
/**
 * Middleware de restriction par aéroport
 * S'assure que les utilisateurs ne peuvent accéder qu'aux données de leur aéroport
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.restrictToAirport = exports.enforceAirportFilter = exports.requireAirportCode = void 0;
const database_1 = require("../config/database");
/**
 * Normalise le code aéroport (gère les doublons comme "ALL,ALL" -> "ALL")
 */
const normalizeAirportCode = (code) => {
    if (!code)
        return undefined;
    // Si c'est un tableau, prendre le premier élément
    if (Array.isArray(code)) {
        return code[0]?.toUpperCase();
    }
    // Si c'est une chaîne avec des virgules (doublons de query params), prendre la première valeur
    if (typeof code === 'string' && code.includes(',')) {
        return code.split(',')[0].trim().toUpperCase();
    }
    return code.toUpperCase();
};
/**
 * Middleware pour extraire et valider l'aéroport de l'utilisateur
 * Vérifie l'authentification Bearer et s'assure que l'utilisateur accède uniquement à son aéroport
 */
const requireAirportCode = async (req, res, next) => {
    try {
        // Récupérer et normaliser l'aéroport depuis les params, query, body, ou headers
        const airportCode = normalizeAirportCode(req.params.airport ||
            req.query.airport ||
            req.body.airport_code ||
            req.headers['x-airport-code']);
        if (!airportCode) {
            return res.status(400).json({
                success: false,
                error: 'Code aéroport requis (paramètre "airport" ou "airport_code")'
            });
        }
        // Vérifier l'authentification Bearer pour obtenir l'utilisateur
        const authHeader = req.headers.authorization;
        let userId;
        let userAirportCode;
        let hasFullAccess = false;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            // Vérifier le token avec Supabase
            const { data: { user }, error: authError } = await database_1.supabase.auth.getUser(token);
            if (!authError && user) {
                userId = user.id;
                // Récupérer l'aéroport et le rôle de l'utilisateur depuis la base de données
                const { data: userData, error: userError } = await database_1.supabase
                    .from('users')
                    .select('airport_code, role')
                    .eq('id', user.id)
                    .single();
                if (!userError && userData) {
                    userAirportCode = userData.airport_code?.toUpperCase();
                    // L'utilisateur a accès total si son airport_code est 'ALL' 
                    // OU si son rôle est 'support' (support technique a accès global)
                    hasFullAccess = userAirportCode === 'ALL' || userData.role === 'support';
                    // Vérifier que l'aéroport demandé correspond à l'aéroport de l'utilisateur
                    // OU que l'utilisateur a accès à tous les aéroports
                    if (!hasFullAccess && userAirportCode !== airportCode) {
                        return res.status(403).json({
                            success: false,
                            error: `Accès refusé : Vous n'avez pas accès aux données de l'aéroport ${airportCode}. Votre aéroport est ${userAirportCode}`
                        });
                    }
                }
            }
        }
        else {
            // Si pas d'authentification Bearer, vérifier x-user-id comme fallback
            const userIdFromHeader = req.headers['x-user-id'] || req.body.user_id;
            if (userIdFromHeader) {
                userId = userIdFromHeader;
                const { data: user, error } = await database_1.supabase
                    .from('users')
                    .select('airport_code, role')
                    .eq('id', userId)
                    .single();
                if (!error && user) {
                    userAirportCode = user.airport_code?.toUpperCase();
                    // L'utilisateur a accès total si son airport_code est 'ALL' 
                    // OU si son rôle est 'support'
                    hasFullAccess = userAirportCode === 'ALL' || user.role === 'support';
                    if (!hasFullAccess && userAirportCode !== airportCode) {
                        return res.status(403).json({
                            success: false,
                            error: 'Accès refusé : Vous n\'avez pas accès aux données de cet aéroport'
                        });
                    }
                }
            }
        }
        // Stocker dans la requête pour utilisation ultérieure
        // Si l'utilisateur a accès total et demande 'ALL', ne pas filtrer par aéroport
        req.userAirportCode = hasFullAccess && airportCode === 'ALL' ? undefined : airportCode;
        req.userActualAirportCode = userAirportCode;
        req.hasFullAccess = hasFullAccess;
        if (userId) {
            req.userId = userId;
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.requireAirportCode = requireAirportCode;
/**
 * Middleware pour forcer le filtre par aéroport dans les requêtes
 */
const enforceAirportFilter = (req, res, next) => {
    const airportCode = req.userAirportCode;
    if (!airportCode) {
        return res.status(400).json({
            success: false,
            error: 'Code aéroport manquant'
        });
    }
    // Ajouter le filtre airport_code à toutes les requêtes
    // Ceci sera utilisé par les routes pour filtrer automatiquement
    req.query.airport = airportCode;
    if (req.body && typeof req.body === 'object') {
        req.body.airport_code = airportCode;
    }
    next();
};
exports.enforceAirportFilter = enforceAirportFilter;
/**
 * Middleware combiné : requireAirportCode + enforceAirportFilter
 */
exports.restrictToAirport = [
    exports.requireAirportCode,
    exports.enforceAirportFilter
];
