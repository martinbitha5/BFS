import bcrypt from 'bcrypt';
import { NextFunction, Request, Response, Router } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/database';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * POST /api/v1/airlines/signup
 * Inscription d'une nouvelle compagnie aérienne
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

    // Vérifier si l'email ou le code existe déjà
    const { data: existing } = await supabase
      .from('airlines')
      .select('id')
      .or(`email.eq.${email},code.eq.${code}`)
      .single();

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Cet email ou ce code IATA est déjà utilisé. Veuillez utiliser d\'autres identifiants ou vous connecter.',
      });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer la compagnie
    const { data: airline, error } = await supabase
      .from('airlines')
      .insert({
        name,
        code: code.toUpperCase(),
        email,
        password: hashedPassword,
      })
      .select('id, name, code, email, created_at')
      .single();

    if (error) throw error;

    // Générer un token JWT
    const token = jwt.sign(
      { id: airline.id, code: airline.code, email: airline.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      airline,
      token,
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
      return res.status(401).json({
        success: false,
        error: 'Les identifiants saisis sont incorrects. Veuillez vérifier votre email et votre mot de passe.',
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
      .select('id, name, code, email, created_at')
      .eq('id', decoded.id)
      .single();

    if (error || !airline) {
      return res.status(404).json({
        success: false,
        error: 'Votre compte compagnie aérienne n\'a pas été trouvé. Veuillez contacter le support.',
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

export default router;
