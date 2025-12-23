/**
 * Middleware de restriction par aéroport
 * S'assure que les utilisateurs ne peuvent accéder qu'aux données de leur aéroport
 */

import { NextFunction, Request, Response } from 'express';
import { supabase } from '../config/database';

interface AirportRestrictedRequest extends Request {
  userAirportCode?: string;
  userId?: string;
}

/**
 * Middleware pour extraire et valider l'aéroport de l'utilisateur
 * À utiliser avec un système d'authentification
 */
export const requireAirportCode = async (
  req: AirportRestrictedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Récupérer l'aéroport depuis les query params, body, ou headers
    const airportCode = 
      req.query.airport as string ||
      req.body.airport_code as string ||
      req.headers['x-airport-code'] as string;

    if (!airportCode) {
      return res.status(400).json({
        success: false,
        error: 'Code aéroport requis (paramètre "airport" ou "airport_code")'
      });
    }

    // Stocker dans la requête pour utilisation ultérieure
    req.userAirportCode = airportCode;

    // Si on a un user_id (depuis l'auth), vérifier qu'il correspond à cet aéroport
    const userId = req.headers['x-user-id'] as string || req.body.user_id as string;
    if (userId) {
      const { data: user, error } = await supabase
        .from('users')
        .select('airport_code')
        .eq('id', userId)
        .single();

      if (!error && user && user.airport_code !== airportCode) {
        return res.status(403).json({
          success: false,
          error: 'Accès refusé : Vous n\'avez pas accès aux données de cet aéroport'
        });
      }

      req.userId = userId;
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware pour forcer le filtre par aéroport dans les requêtes
 */
export const enforceAirportFilter = (
  req: AirportRestrictedRequest,
  res: Response,
  next: NextFunction
) => {
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

/**
 * Middleware combiné : requireAirportCode + enforceAirportFilter
 */
export const restrictToAirport = [
  requireAirportCode,
  enforceAirportFilter
];

