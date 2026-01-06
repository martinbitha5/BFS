"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const auth_errors_util_1 = require("../utils/auth-errors.util");
const errorHandler = (err, req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
        console.error('Error:', err);
    }
    // Determine status code - default to 500 if not set
    // Express doesn't set statusCode automatically, so we check if it was explicitly set
    const statusCode = (res.statusCode && res.statusCode !== 200) ? res.statusCode : 500;
    // Normaliser le message d'erreur pour les routes d'authentification
    const isAuthRoute = req.path.includes('/auth');
    const context = req.path.includes('/login') ? 'login' : req.path.includes('/register') ? 'register' : 'general';
    // Utiliser un message normalisé pour les erreurs d'authentification
    const errorMessage = isAuthRoute
        ? (0, auth_errors_util_1.normalizeHttpAuthError)(statusCode, context)
        : err.message || 'Une erreur est survenue. Veuillez réessayer.';
    res.status(statusCode).json({
        success: false,
        error: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        timestamp: new Date().toISOString()
    });
};
exports.errorHandler = errorHandler;
