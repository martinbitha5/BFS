import { Router, Request, Response, NextFunction } from 'express';
import { isMockMode } from '../config/database';
import { validateSupervisor, getSupervisorById } from '../data/mockSupervisors';

const router = Router();

/**
 * POST /api/v1/auth/register
 * Inscription d'un nouveau superviseur
 */
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name, airportCode } = req.body;

    if (!email || !password || !name || !airportCode) {
      return res.status(400).json({
        success: false,
        error: 'Tous les champs sont requis'
      });
    }

    if (isMockMode) {
      // Vérifier si l'email existe déjà
      const { mockSupervisors } = require('../data/mockSupervisors');
      const existingSupervisor = mockSupervisors.find((s: any) => s.email === email);
      
      if (existingSupervisor) {
        return res.status(409).json({
          success: false,
          error: 'Cet email est déjà utilisé'
        });
      }

      // Créer le nouveau superviseur
      const newSupervisor = {
        id: `sup_${Date.now()}`,
        email,
        name,
        airportCode,
        role: 'supervisor' as const,
        password
      };

      // Ajouter aux données mockées (en mémoire uniquement)
      mockSupervisors.push(newSupervisor);

      const { password: _, ...supervisorData } = newSupervisor;
      
      return res.status(201).json({
        success: true,
        data: {
          user: supervisorData,
          token: `mock_token_${newSupervisor.id}`,
        },
        message: 'Inscription réussie'
      });
    }

    // TODO: Implémenter l'inscription avec Supabase en mode production
    return res.status(501).json({
      success: false,
      error: 'Inscription avec base de données non implémentée'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/auth/login
 * Connexion d'un superviseur
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email et mot de passe requis'
      });
    }

    if (isMockMode) {
      // Mode test avec données mockées
      const supervisor = validateSupervisor(email, password);
      
      if (!supervisor) {
        return res.status(401).json({
          success: false,
          error: 'Email ou mot de passe incorrect'
        });
      }

      // Retourner les infos du superviseur (sans le mot de passe)
      const { password: _, ...supervisorData } = supervisor;
      
      return res.json({
        success: true,
        data: {
          user: supervisorData,
          // En production, on générerait un vrai JWT token
          token: `mock_token_${supervisor.id}`,
        }
      });
    }

    // TODO: Implémenter l'authentification avec Supabase en mode production
    return res.status(501).json({
      success: false,
      error: 'Authentification avec base de données non implémentée'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/auth/me
 * Obtenir les informations du superviseur connecté
 */
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Récupérer le token depuis les headers
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token manquant'
      });
    }

    const token = authHeader.substring(7); // Enlever "Bearer "

    if (isMockMode) {
      // Extraire l'ID du token mock
      const match = token.match(/^mock_token_(.+)$/);
      if (!match) {
        return res.status(401).json({
          success: false,
          error: 'Token invalide'
        });
      }

      const supervisorId = match[1];
      const supervisor = getSupervisorById(supervisorId);

      if (!supervisor) {
        return res.status(401).json({
          success: false,
          error: 'Superviseur non trouvé'
        });
      }

      // Retourner les infos (sans le mot de passe)
      const { password: _, ...supervisorData } = supervisor;
      
      return res.json({
        success: true,
        data: supervisorData
      });
    }

    // TODO: Implémenter la vérification JWT en mode production
    return res.status(501).json({
      success: false,
      error: 'Vérification token non implémentée'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/auth/logout
 * Déconnexion (pour invalidation token côté serveur si besoin)
 */
router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // En mode mock, rien à faire côté serveur
    res.json({
      success: true,
      message: 'Déconnexion réussie'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
