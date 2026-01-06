import bcrypt from 'bcrypt';
import { NextFunction, Request, Response, Router } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/database';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  // Vérifier si on est en production (soit NODE_ENV=production, soit pas de NODE_ENV défini mais pas en développement)
  const isProduction = process.env.NODE_ENV === 'production' || (!process.env.NODE_ENV && !process.env.DEV);
  if (isProduction) {
    console.error('❌ ERREUR: JWT_SECRET doit être défini en production!');
    console.error('   NODE_ENV:', process.env.NODE_ENV || 'non défini');
    console.error('   Variables disponibles:', Object.keys(process.env).filter(k => k.includes('JWT') || k.includes('SUPABASE')).join(', '));
    throw new Error('JWT_SECRET must be set in production environment');
  }
  return 'your-secret-key-change-in-production';
})();

/**
 * POST /api/v1/airlines/signup
 * Inscription d'une nouvelle compagnie aérienne (crée une demande d'approbation)
 */
router.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, code, email, password } = req.body;

    if (!name || !code || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Veuillez remplir tous les champs requis pour créer votre compte.',
      });
    }

    if (code.length !== 2) {
      return res.status(400).json({
        success: false,
        error: 'Le code IATA doit contenir exactement 2 lettres',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Le mot de passe doit contenir au moins 6 caractères',
      });
    }

    // Vérifier si l'email ou le code existe déjà dans airlines
    const { data: existingAirline } = await supabase
      .from('airlines')
      .select('id')
      .or(`email.eq.${email},code.eq.${code.toUpperCase()}`)
      .single();

    if (existingAirline) {
      return res.status(409).json({
        success: false,
        error: 'Cet email ou ce code IATA est déjà utilisé. Veuillez utiliser d\'autres identifiants ou vous connecter.',
      });
    }

    // Vérifier si une demande existe déjà
    const { data: existingRequest } = await supabase
      .from('airline_registration_requests')
      .select('id, status')
      .or(`email.eq.${email},code.eq.${code.toUpperCase()}`)
      .single();

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return res.status(409).json({
          success: false,
          error: 'Une demande d\'inscription est déjà en attente pour cet email ou ce code IATA. Veuillez patienter l\'approbation.',
        });
      } else if (existingRequest.status === 'approved') {
        return res.status(409).json({
          success: false,
          error: 'Ce compte a déjà été approuvé. Veuillez vous connecter.',
        });
      }
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer une demande d'inscription (pas directement l'airline)
    const { data: request, error } = await supabase
      .from('airline_registration_requests')
      .insert({
        name,
        code: code.toUpperCase(),
        email,
        password: hashedPassword,
        status: 'pending',
      })
      .select('id, name, code, email, status, requested_at')
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Votre demande d\'inscription a été soumise avec succès. Votre compte sera validé sous 24h, vous pourrez ensuite vous connecter.',
      request: {
        id: request.id,
        name: request.name,
        code: request.code,
        email: request.email,
        status: request.status,
        requested_at: request.requested_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/airlines/login
 * Connexion d'une compagnie aérienne
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Veuillez saisir votre email et votre mot de passe.',
      });
    }

    // Trouver la compagnie
    const { data: airline, error } = await supabase
      .from('airlines')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !airline) {
      // Vérifier si c'est une demande en attente
      const { data: pendingRequest } = await supabase
        .from('airline_registration_requests')
        .select('id, status')
        .eq('email', email)
        .eq('status', 'pending')
        .single();

      if (pendingRequest) {
        return res.status(403).json({
          success: false,
          error: 'Votre compte n\'a pas encore été validé. La validation se fait sous 24h, veuillez réessayer plus tard.',
          requiresApproval: true,
        });
      }

      return res.status(401).json({
        success: false,
        error: 'Les identifiants saisis sont incorrects. Veuillez vérifier votre email et votre mot de passe.',
      });
    }

    // Vérifier que l'airline est approuvée
    if (!airline.approved) {
      return res.status(403).json({
        success: false,
        error: 'Votre compte n\'a pas encore été validé. La validation se fait sous 24h, veuillez réessayer plus tard.',
        requiresApproval: true,
      });
    }

    // Vérifier le mot de passe
    const validPassword = await bcrypt.compare(password, airline.password);

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: 'Les identifiants saisis sont incorrects. Veuillez vérifier votre email et votre mot de passe.',
      });
    }

    // Générer un token JWT
    const token = jwt.sign(
      { id: airline.id, code: airline.code, email: airline.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Retourner sans le mot de passe
    const { password: _, ...airlineData } = airline;

    res.json({
      success: true,
      airline: airlineData,
      token,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/airlines/me
 * Récupérer les infos de la compagnie connectée
 */
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentification requise. Veuillez vous connecter.',
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;

    const { data: airline, error } = await supabase
      .from('airlines')
      .select('id, name, code, email, approved, created_at')
      .eq('id', decoded.id)
      .single();

    if (error || !airline) {
      return res.status(404).json({
        success: false,
        error: 'Votre compte compagnie aérienne n\'a pas été trouvé. Veuillez contacter le support.',
      });
    }

    // Vérifier que l'airline est approuvée
    if (!airline.approved) {
      return res.status(403).json({
        success: false,
        error: 'Votre compte n\'a pas encore été validé. La validation se fait sous 24h, veuillez réessayer plus tard.',
        requiresApproval: true,
      });
    }

    res.json({
      success: true,
      airline,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/airlines/create-by-support
 * Crée une compagnie aérienne - Réservé au Support
 */
router.post('/create-by-support', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Vérifier l'authentification
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentification requise' 
      });
    }

    const token = authHeader.substring(7);
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authUser) {
      return res.status(401).json({ 
        success: false, 
        error: 'Token invalide' 
      });
    }

    // Vérifier que l'utilisateur est support
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('role, is_approved')
      .eq('id', authUser.id)
      .single();

    if (userError || !currentUser || currentUser.role !== 'support' || !currentUser.is_approved) {
      return res.status(403).json({ 
        success: false, 
        error: 'Accès refusé : Seul le support peut créer des compagnies aériennes' 
      });
    }

    const { name, code, email, password } = req.body;

    if (!name || !code || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Tous les champs sont requis (nom, code IATA, email, mot de passe)',
      });
    }

    if (code.length !== 2) {
      return res.status(400).json({
        success: false,
        error: 'Le code IATA doit contenir exactement 2 lettres',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Le mot de passe doit contenir au moins 6 caractères',
      });
    }

    // Vérifier si l'email ou le code existe déjà
    const { data: existingAirline } = await supabase
      .from('airlines')
      .select('id')
      .or(`email.eq.${email},code.eq.${code.toUpperCase()}`)
      .single();

    if (existingAirline) {
      return res.status(409).json({
        success: false,
        error: 'Une compagnie aérienne avec cet email ou ce code IATA existe déjà',
      });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer l'airline directement dans la table airlines
    const { data: airline, error: airlineError } = await supabase
      .from('airlines')
      .insert({
        name,
        code: code.toUpperCase(),
        email,
        password: hashedPassword,
        approved: true,
        approved_at: new Date().toISOString(),
        approved_by: authUser.id,
      })
      .select('id, name, code, email')
      .single();

    if (airlineError) {
      if (airlineError.code === '23505') {
        return res.status(409).json({
          success: false,
          error: 'Une compagnie aérienne avec cet email ou ce code existe déjà',
        });
      }
      throw airlineError;
    }

    // Créer une demande d'enregistrement approuvée pour traçabilité
    const { data: request, error: requestError } = await supabase
      .from('airline_registration_requests')
      .insert({
        name,
        code: code.toUpperCase(),
        email,
        password: hashedPassword,
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: authUser.id,
        airline_id: airline.id,
      })
      .select('id')
      .single();

    if (requestError) {
      console.error('Erreur lors de la création de la demande de traçabilité:', requestError);
      // Ne pas bloquer si la demande de traçabilité échoue
    }

    // Log d'audit
    await supabase.from('audit_logs').insert({
      action: 'CREATE_AIRLINE_BY_SUPPORT',
      entity_type: 'airline',
      entity_id: airline.id,
      description: `Création et approbation de la compagnie aérienne ${name} (${code.toUpperCase()}) par le support`,
      user_id: authUser.id,
      airport_code: 'ALL'
    });

    res.status(201).json({
      success: true,
      data: {
        id: airline.id,
        name: airline.name,
        code: airline.code,
        email: airline.email,
      },
      message: `Compagnie aérienne "${name}" (${code.toUpperCase()}) créée et approuvée avec succès`,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
