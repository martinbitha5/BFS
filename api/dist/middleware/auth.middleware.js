"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeyAuth = void 0;
/**
 * Middleware simple pour vérifier l'API key (optionnel)
 */
const apiKeyAuth = (req, res, next) => {
    // Clé API par défaut si non configurée
    const apiKey = process.env.API_KEY || 'bfs-api-key-secure-2025';
    // Récupérer la clé depuis les headers ou query params
    let providedKey = req.headers['x-api-key'];
    if (!providedKey) {
        providedKey = req.query.api_key;
    }
    // Normaliser la clé (enlever les espaces, gérer les tableaux)
    if (Array.isArray(providedKey)) {
        providedKey = providedKey[0];
    }
    if (providedKey) {
        providedKey = providedKey.trim();
    }
    // Si aucune clé n'est fournie, rejeter
    if (!providedKey) {
        console.warn('[Auth] No API key provided in request');
        return res.status(401).json({ error: 'Unauthorized - API key required' });
    }
    // Vérifier que la clé correspond
    if (providedKey !== apiKey) {
        console.warn(`[Auth] Invalid API key attempt: "${providedKey}" (expected: "${apiKey}")`);
        return res.status(401).json({ error: 'Unauthorized - Invalid API key' });
    }
    next();
};
exports.apiKeyAuth = apiKeyAuth;
