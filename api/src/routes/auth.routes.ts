import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../config/database';

const router = Router();

/**
 * POST /api/v1/auth/register
 * Inscription d'un nouveau superviseur
 */
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name, airportCode, role = 'supervisor' } = req.body;

    if (!email || !password || !name || !airportCode) {
      return res.status(400).json({
        success: false,
        error: 'Tous les champs sont requis'
      });
    }

    // Créer l'utilisateur dans Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) {
      return res.status(400).json({
        success: false,
        error: authError.message
      });
    }

    // Créer le profil dans la table users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        full_name: name,
        airport_code: airportCode,
        role
      })
      .select()
      .single();

    if (userError) {
      // Nettoyer l'utilisateur créé si l'insertion du profil échoue
      await supabase.auth.admin.deleteUser(authData.user.id);
      return res.status(400).json({
        success: false,
        error: userError.message
      });
    }

    // Connecter automatiquement l'utilisateur après l'inscription
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      return res.status(500).json({
        success: false,
        error: 'Compte créé mais erreur de connexion automatique'
      });
    }

    return res.status(201).json({
      success: true,
      data: {
        user: userData,
        token: signInData.session?.access_token
      },
      message: 'Inscription réussie'
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

    // Authentification avec Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      return res.status(401).json({
        success: false,
        error: 'Email ou mot de passe incorrect'
      });
    }

    // Récupérer le profil utilisateur
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (userError) {
      return res.status(404).json({
        success: false,
        error: 'Profil utilisateur non trouvé'
      });
    }

    return res.json({
      success: true,
      data: {
        user: userData,
        token: authData.session?.access_token
      }
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

    // Vérifier le token avec Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({
        success: false,
        error: 'Token invalide'
      });
    }

    // Récupérer le profil utilisateur
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userError) {
      return res.status(404).json({
        success: false,
        error: 'Profil utilisateur non trouvé'
      });
    }

    return res.json({
      success: true,
      data: userData
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/auth/logout
 * Déconnexion
 */
router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      await supabase.auth.signOut();
    }

    res.json({
      success: true,
      message: 'Déconnexion réussie'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
