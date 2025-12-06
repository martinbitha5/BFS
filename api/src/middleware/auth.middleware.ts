import { Request, Response, NextFunction } from 'express';

/**
 * Middleware simple pour vérifier l'API key (optionnel)
 */
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = process.env.API_KEY;
  
  // Si aucune API key n'est configurée, on skip la vérification
  if (!apiKey) {
    return next();
  }

  const providedKey = req.headers['x-api-key'] || req.query.api_key;

  if (providedKey !== apiKey) {
    return res.status(401).json({ error: 'Unauthorized - Invalid API key' });
  }

  next();
};
