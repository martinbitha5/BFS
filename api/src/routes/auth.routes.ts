import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../config/database';
import { normalizeAuthError, normalizeHttpAuthError } from '../utils/auth-errors.util';

const router = Router();

/**
 * POST /api/v1/auth/register
 * Inscription d'un nouveau superviseur ou litige bagages
 * Nécessite une approbation par le support
 */
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name, airportCode, role } = req.body;

    // Validation des champs requis
    if (!email || !password || !name || !role) {
      return res.status(400).json({
        success: false,
        error: 'Veuillez remplir tous les champs requis pour créer votre compte.'
      });
    }

    // Vérifier que le rôle est valide pour le dashboard
    if (!['supervisor', 'baggage_dispute'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Rôle invalide. Les rôles valides sont: supervisor, baggage_dispute'
      });
    }

    // Pour supervisor, airportCode est requis
    if (role === 'supervisor' && !airportCode) {
      return res.status(400).json({
        success: false,
        error: 'Le code aéroport est requis pour les superviseurs'
      });
    }

    // Pour baggage_dispute, airportCode n'est pas requis (accès à tous les aéroports)
    const finalAirportCode = role === 'baggage_dispute' ? 'ALL' : airportCode;

    // Vérifier si une demande existe déjà pour cet email
    const { data: existingRequest } = await supabase
      .from('user_registration_requests')
      .select('*')
      .eq('email', email)
      .in('status', ['pending', 'approved'])
      .single();

    if (existingRequest) {
      return res.status(409).json({
        success: false,
        error: 'Une demande d\'inscription existe déjà pour cet email. Veuillez attendre l\'approbation ou contacter le support.'
      });
    }

    // Vérifier si l'utilisateur existe déjà
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Un compte existe déjà avec cet email. Veuillez vous connecter.'
      });
    }

    // Créer l'utilisateur dans Supabase Auth (mais pas encore approuvé)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) {
      return res.status(400).json({
        success: false,
        error: normalizeAuthError(authError.message, 'register')
      });
    }

    // Créer le profil dans la table users (non approuvé par défaut)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        full_name: name,
        airport_code: finalAirportCode,
        role,
        is_approved: false // Non approuvé par défaut
      })
      .select()
      .single();

    if (userError) {
      // Nettoyer l'utilisateur créé si l'insertion du profil échoue
      await supabase.auth.admin.deleteUser(authData.user.id);
      return res.status(400).json({
        success: false,
        error: 'Une erreur est survenue lors de la création de votre profil. Veuillez réessayer.'
      });
    }

    // Créer la demande d'inscription
    const { data: registrationRequest, error: requestError } = await supabase
      .from('user_registration_requests')
      .insert({
        email,
        full_name: name,
        airport_code: finalAirportCode,
        role,
        status: 'pending',
        auth_user_id: authData.user.id
      })
      .select()
      .single();

    if (requestError) {
      console.error('Error creating registration request:', requestError);
      // Ne pas échouer si la demande ne peut pas être créée, l'utilisateur existe déjà
    }

    // NE PAS connecter automatiquement l'utilisateur - il doit attendre l'approbation
    return res.status(201).json({
      success: true,
      data: {
        userId: userData.id,
        requestId: registrationRequest?.id,
        email: userData.email,
        role: userData.role
      },
      message: 'Votre demande d\'inscription a été soumise avec succès. Vous recevrez un email une fois votre compte approuvé par le support.',
      requiresApproval: true
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
        error: 'Veuillez saisir votre email et votre mot de passe.'
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
        error: normalizeAuthError(authError.message, 'login')
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
        error: 'Votre profil utilisateur n\'a pas été trouvé. Veuillez contacter le support.'
      });
    }

    // RESTRICTION: Seuls supervisor, baggage_dispute et support peuvent accéder au Dashboard
    // Les agents opérationnels (checkin, baggage, boarding, arrival) utilisent l'application mobile/portail
    const dashboardRoles = ['supervisor', 'baggage_dispute', 'support'];
    if (!dashboardRoles.includes(userData.role)) {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé : Ce compte est réservé aux agents opérationnels. Veuillez utiliser l\'application mobile dédiée.',
        role: userData.role
      });
    }

    // Vérifier que l'utilisateur est approuvé (pour supervisor et baggage_dispute)
    if (['supervisor', 'baggage_dispute'].includes(userData.role) && !userData.is_approved) {
      return res.status(403).json({
        success: false,
        error: 'Votre compte n\'a pas encore été approuvé par le support. Veuillez patienter ou contacter le support pour plus d\'informations.',
        requiresApproval: true
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
        error: 'Authentification requise. Veuillez vous connecter.'
      });
    }

    const token = authHeader.substring(7); // Enlever "Bearer "

    // Vérifier le token avec Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({
        success: false,
        error: 'Votre session a expiré. Veuillez vous reconnecter.'
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
        error: 'Votre profil utilisateur n\'a pas été trouvé. Veuillez contacter le support.'
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
