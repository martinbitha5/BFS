/**
 * Utilitaire pour normaliser les messages d'erreur d'authentification
 * Transforme les messages techniques en messages utilisateur professionnels et modernes
 */

/**
 * Normalise les messages d'erreur d'authentification Supabase en messages utilisateur professionnels
 * @param errorMessage - Message d'erreur brut de Supabase
 * @param context - Contexte de l'erreur ('login' | 'register' | 'general')
 * @returns Message d'erreur professionnel et compréhensible
 */
export function normalizeAuthError(
  errorMessage: string,
  context: 'login' | 'register' | 'general' = 'general'
): string {
  const lowerMessage = errorMessage.toLowerCase();

  // Erreurs de connexion
  if (context === 'login') {
    // Identifiants incorrects
    if (
      lowerMessage.includes('invalid login credentials') ||
      lowerMessage.includes('invalid_credentials') ||
      lowerMessage.includes('email not confirmed') ||
      lowerMessage.includes('wrong password') ||
      lowerMessage.includes('user not found')
    ) {
      return 'Les identifiants saisis sont incorrects. Veuillez vérifier votre email et votre mot de passe.';
    }

    // Compte non trouvé
    if (
      lowerMessage.includes('user not found') ||
      lowerMessage.includes('no user found')
    ) {
      return 'Aucun compte n\'a été trouvé avec cet email. Veuillez vérifier votre adresse email ou créer un compte.';
    }

    // Compte désactivé ou suspendu
    if (
      lowerMessage.includes('user is disabled') ||
      lowerMessage.includes('account disabled')
    ) {
      return 'Votre compte a été désactivé. Veuillez contacter le support pour plus d\'informations.';
    }

    // Trop de tentatives
    if (
      lowerMessage.includes('too many requests') ||
      lowerMessage.includes('rate limit')
    ) {
      return 'Trop de tentatives de connexion. Veuillez patienter quelques instants avant de réessayer.';
    }
  }

  // Erreurs d'inscription
  if (context === 'register') {
    // Email déjà utilisé
    if (
      lowerMessage.includes('user already registered') ||
      lowerMessage.includes('email already exists') ||
      lowerMessage.includes('already registered') ||
      lowerMessage.includes('duplicate key')
    ) {
      return 'Cet email est déjà utilisé. Veuillez vous connecter ou utiliser une autre adresse email.';
    }

    // Mot de passe trop faible
    if (
      lowerMessage.includes('password') &&
      (lowerMessage.includes('weak') || lowerMessage.includes('short') || lowerMessage.includes('minimum'))
    ) {
      return 'Le mot de passe doit contenir au moins 6 caractères. Veuillez choisir un mot de passe plus fort.';
    }

    // Email invalide
    if (
      lowerMessage.includes('invalid email') ||
      lowerMessage.includes('email format')
    ) {
      return 'L\'adresse email saisie n\'est pas valide. Veuillez vérifier le format de votre email.';
    }
  }

  // Erreurs générales communes
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('connection') ||
    lowerMessage.includes('timeout')
  ) {
    return 'Problème de connexion. Vérifiez votre connexion internet et réessayez.';
  }

  if (
    lowerMessage.includes('token') &&
    (lowerMessage.includes('expired') || lowerMessage.includes('invalid'))
  ) {
    return 'Votre session a expiré. Veuillez vous reconnecter.';
  }

  if (lowerMessage.includes('unauthorized') || lowerMessage.includes('permission denied')) {
    return 'Vous n\'avez pas les permissions nécessaires pour effectuer cette action.';
  }

  // Message par défaut professionnel
  if (context === 'login') {
    return 'Une erreur est survenue lors de la connexion. Veuillez réessayer.';
  }

  if (context === 'register') {
    return 'Une erreur est survenue lors de l\'inscription. Veuillez réessayer.';
  }

  return 'Une erreur est survenue. Veuillez réessayer.';
}

/**
 * Normalise les codes d'erreur HTTP en messages utilisateur professionnels
 * @param statusCode - Code de statut HTTP
 * @param context - Contexte de l'erreur
 * @returns Message d'erreur professionnel
 */
export function normalizeHttpAuthError(
  statusCode: number,
  context: 'login' | 'register' | 'general' = 'general'
): string {
  switch (statusCode) {
    case 400:
      return context === 'register'
        ? 'Veuillez remplir tous les champs requis correctement.'
        : 'Les informations fournies sont invalides. Veuillez vérifier vos données.';
    
    case 401:
      return 'Les identifiants saisis sont incorrects. Veuillez vérifier votre email et votre mot de passe.';
    
    case 403:
      return 'Vous n\'avez pas les permissions nécessaires pour effectuer cette action.';
    
    case 404:
      return context === 'login'
        ? 'Aucun compte n\'a été trouvé avec cet email.'
        : 'La ressource demandée n\'a pas été trouvée.';
    
    case 409:
      return 'Cet email est déjà utilisé. Veuillez vous connecter ou utiliser une autre adresse email.';
    
    case 429:
      return 'Trop de tentatives. Veuillez patienter quelques instants avant de réessayer.';
    
    case 500:
    case 502:
    case 503:
      return 'Un problème technique est survenu. Veuillez réessayer dans quelques instants.';
    
    default:
      return 'Une erreur est survenue. Veuillez réessayer.';
  }
}

