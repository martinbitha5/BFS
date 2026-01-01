/**
 * Middleware de restriction par aéroport
 * S'assure que les utilisateurs ne peuvent accéder qu'aux données de leur aéroport
 */

import { NextFunction, Request, Response } from 'express';
import { supabase } from '../config/database';

interface AirportRestrictedRequest extends Request {
  userAirportCode?: string;
  userActualAirportCode?: string; // L'aéroport réel de l'utilisateur (depuis la BDD)
  hasFullAccess?: boolean; // true si l'utilisateur a accès à tous les aéroports
  userId?: string;
}

/**
 * Normalise le code aéroport (gère les doublons comme "ALL,ALL" -> "ALL")
 */
const normalizeAirportCode = (code: string | string[] | undefined): string | undefined => {
  if (!code) return undefined;
  
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
export const requireAirportCode = async (
  req: AirportRestrictedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Récupérer et normaliser l'aéroport depuis les params, query, body, ou headers
    const airportCode = normalizeAirportCode(
      req.params.airport as string ||
      req.query.airport as string | string[] ||
      req.body.airport_code as string ||
      req.headers['x-airport-code'] as string
    );

    if (!airportCode) {
      return res.status(400).json({
        success: false,
        error: 'Code aéroport requis (paramètre "airport" ou "airport_code")'
      });
    }

    // Vérifier l'authentification Bearer pour obtenir l'utilisateur
    const authHeader = req.headers.authorization;
    let userId: string | undefined;
    let userAirportCode: string | undefined;
    let hasFullAccess = false;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      // Vérifier le token avec Supabase
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (!authError && user) {
        userId = user.id;
        
        // Récupérer l'aéroport et le rôle de l'utilisateur depuis la base de données
        const { data: userData, error: userError } = await supabase
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
    } else {
      // Si pas d'authentification Bearer, vérifier x-user-id comme fallback
      const userIdFromHeader = req.headers['x-user-id'] as string || req.body.user_id as string;
      if (userIdFromHeader) {
        userId = userIdFromHeader;
        const { data: user, error } = await supabase
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

