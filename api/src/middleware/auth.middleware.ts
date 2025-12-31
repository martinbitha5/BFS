import { NextFunction, Request, Response } from 'express';

/**
 * Middleware simple pour vérifier l'API key (optionnel)
 */
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
  // Clé API par défaut si non configurée
  const apiKey = process.env.API_KEY || 'bfs-api-key-secure-2025';
  
  const providedKey = req.headers['x-api-key'] || req.query.api_key;

  // Si aucune clé n'est fournie, rejeter
  if (!providedKey) {
    return res.status(401).json({ error: 'Unauthorized - API key required' });
  }

  // Vérifier que la clé correspond
  if (providedKey !== apiKey) {
    console.warn(`[Auth] Invalid API key attempt: ${providedKey}`);
    return res.status(401).json({ error: 'Unauthorized - Invalid API key' });
  }

  next();
};
