/**
 * Routes pour la gestion des utilisateurs
 * Permet aux superviseurs de gérer les agents de leur aéroport
 */

import { NextFunction, Request, Response, Router } from 'express';
import { supabase } from '../config/database';

const router = Router();

/**
 * GET /api/v1/users
 * Liste tous les utilisateurs d'un aéroport
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const airportCode = req.query.airport as string || req.headers['x-airport-code'] as string;

    if (!airportCode) {
      return res.status(400).json({ error: 'Code aéroport requis' });
    }

    let query = supabase.from('users').select('*');
    if (airportCode !== 'ALL' && airportCode !== 'all') {
      query = query.eq('airport_code', airportCode);
    }
    const { data: users, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
    }

    res.json({
      success: true,
      data: users || []
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/v1/users/:id
 * Récupère un utilisateur par son ID
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /api/v1/users
 * Crée un nouvel utilisateur
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, full_name, role, airport_code } = req.body;

    if (!email || !password || !full_name || !role || !airport_code) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    const validRoles = ['checkin', 'baggage', 'boarding', 'arrival', 'supervisor', 'baggage_dispute', 'support'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Rôle invalide' });
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role,
        airport_code
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return res.status(400).json({ error: authError.message });
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        full_name,
        role,
        airport_code,
        is_approved: true
      })
      .select()
      .single();

    if (userError) {
      console.error('Error creating user record:', userError);
      await supabase.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({ error: 'Erreur lors de la création de l\'utilisateur' });
    }

    // ⛔ Ne pas logger les actions du support (pas de trace)
    const userRole = req.headers['x-user-role'] as string;
    if (userRole !== 'support') {
      await supabase.from('audit_logs').insert({
        action: 'CREATE_USER',
        entity_type: 'user',
        entity_id: userData.id,
        description: `Création de l'utilisateur ${full_name} (${email}) avec le rôle ${role}`,
        airport_code,
        user_id: req.headers['x-user-id'] as string
      });
    }

    res.status(201).json({
      success: true,
      data: userData
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * PUT /api/v1/users/:id
 * Modifie un utilisateur
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { full_name, role, password } = req.body;

    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingUser) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    if (password && password.length >= 6) {
      const { error: pwdError } = await supabase.auth.admin.updateUserById(id, {
        password
      });

      if (pwdError) {
        console.error('Error updating password:', pwdError);
        return res.status(400).json({ error: 'Erreur lors de la mise à jour du mot de passe' });
      }
    }

    const updateData: any = {};
    if (full_name) updateData.full_name = full_name;
    if (role) updateData.role = role;
    updateData.updated_at = new Date().toISOString();

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating user:', updateError);
      return res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }

    // ⛔ Ne pas logger les actions du support (pas de trace)
    const userRole = req.headers['x-user-role'] as string;
    if (userRole !== 'support') {
      await supabase.from('audit_logs').insert({
        action: 'UPDATE_USER',
        entity_type: 'user',
        entity_id: id,
        description: `Modification de l'utilisateur ${updatedUser.full_name}`,
        airport_code: existingUser.airport_code,
        user_id: req.headers['x-user-id'] as string
      });
    }

    res.json({
      success: true,
      data: updatedUser
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * DELETE /api/v1/users/:id
 * Supprime un utilisateur
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingUser) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting user record:', deleteError);
      return res.status(500).json({ error: 'Erreur lors de la suppression' });
    }

    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(id);

    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError);
    }

    // ⛔ Ne pas logger les actions du support (pas de trace)
    const userRole = req.headers['x-user-role'] as string;
    if (userRole !== 'support') {
      await supabase.from('audit_logs').insert({
        action: 'DELETE_USER',
        entity_type: 'user',
        entity_id: id,
        description: `Suppression de l'utilisateur ${existingUser.full_name} (${existingUser.email})`,
        airport_code: existingUser.airport_code,
        user_id: req.headers['x-user-id'] as string
      });
    }

    res.json({
      success: true,
      message: 'Utilisateur supprimé avec succès'
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /api/v1/users/:id/reset-password
 * Réinitialise le mot de passe d'un utilisateur
 */
router.post('/:id/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
    }

    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingUser) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const { error: pwdError } = await supabase.auth.admin.updateUserById(id, {
      password
    });

    if (pwdError) {
      console.error('Error resetting password:', pwdError);
      return res.status(400).json({ error: 'Erreur lors de la réinitialisation du mot de passe' });
    }

    await supabase.from('audit_logs').insert({
      action: 'RESET_PASSWORD',
      entity_type: 'user',
      entity_id: id,
      description: `Réinitialisation du mot de passe de ${existingUser.full_name}`,
      airport_code: existingUser.airport_code,
      user_id: req.headers['x-user-id'] as string
    });

    res.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès'
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /api/v1/users/create-by-support
 * Crée un utilisateur Dashboard (supervisor ou baggage_dispute) - Réservé au Support
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
        error: 'Accès refusé : Seul le support peut créer des comptes' 
      });
    }

    const { email, password, full_name, role, airport_code } = req.body;

    if (!email || !password || !full_name || !role) {
      return res.status(400).json({ 
        success: false, 
        error: 'Tous les champs sont requis' 
      });
    }

    // Vérifier que le rôle est valide pour le Dashboard
    const validRoles = ['supervisor', 'baggage_dispute'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Rôle invalide. Les rôles valides sont: supervisor, baggage_dispute' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        error: 'Le mot de passe doit contenir au moins 6 caractères' 
      });
    }

    // Pour supervisor, airport_code est requis
    if (role === 'supervisor' && !airport_code) {
      return res.status(400).json({ 
        success: false, 
        error: 'Le code aéroport est requis pour les superviseurs' 
      });
    }

    const finalAirportCode = role === 'baggage_dispute' ? 'ALL' : airport_code;

    // Vérifier si l'email existe déjà
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        error: 'Un compte existe déjà avec cet email' 
      });
    }

    // Créer l'utilisateur dans Supabase Auth
    const { data: authData, error: createAuthError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (createAuthError) {
      return res.status(400).json({ 
        success: false, 
        error: createAuthError.message 
      });
    }

    // Créer l'entrée dans la table users (directement approuvé)
    // Note: Ne pas mettre approved_by car cela crée une contrainte FK circulaire
    const { data: userData, error: createUserError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        full_name,
        role,
        airport_code: finalAirportCode,
        is_approved: true, // Créé par support = approuvé automatiquement
        approved_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createUserError) {
      // Nettoyer l'utilisateur créé si l'insertion échoue
      await supabase.auth.admin.deleteUser(authData.user.id);
      console.error('[Create User] Database insertion error:', createUserError);
      return res.status(500).json({ 
        success: false, 
        error: 'Erreur lors de la création du profil utilisateur',
        details: createUserError.message || createUserError.hint || null
      });
    }

    // Log d'audit
    await supabase.from('audit_logs').insert({
      action: 'CREATE_USER_BY_SUPPORT',
      entity_type: 'user',
      entity_id: userData.id,
      description: `Création de l'utilisateur ${full_name} (${email}) avec le rôle ${role} par le support`,
      airport_code: finalAirportCode,
      user_id: authUser.id
    });

    res.status(201).json({
      success: true,
      data: userData,
      message: `Utilisateur "${full_name}" créé avec succès`
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;

