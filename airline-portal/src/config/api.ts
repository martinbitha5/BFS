// Configuration centralisée de l'API
// FORCER l'URL de production pour éviter les anciennes configs Render
// Cette fonction s'exécute au runtime pour détecter le domaine actuel

function getApiUrl(): string {
  // Vérifier si on est dans un navigateur
  if (typeof window === 'undefined') {
    return 'https://api.brsats.com'; // Par défaut pour SSR
  }
  
  const hostname = window.location.hostname;
  
  // En développement local, utiliser localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
    return 'http://localhost:3000';
  }
  
  // TOUJOURS utiliser api.brsats.com en production sur les domaines brsats.com
  // Ignorer complètement toute variable d'environnement qui pourrait pointer vers Render
  if (hostname.includes('brsats.com') || hostname.includes('airline-portal')) {
    return 'https://api.brsats.com';
  }
  
  // Pour tout autre domaine en production, utiliser api.brsats.com par défaut
  // NE JAMAIS utiliser une URL Render même si elle est dans les variables d'environnement
  return 'https://api.brsats.com';
}

// Exporter une fonction qui sera appelée au runtime plutôt qu'une constante
// Cela garantit que la détection du domaine se fait au moment de l'exécution
let cachedApiUrl: string | null = null;

export function getApiUrlRuntime(): string {
  if (cachedApiUrl === null) {
    cachedApiUrl = getApiUrl();
    
    // Logs pour debug
    if (typeof window !== 'undefined') {
      console.log('[API Config] ==========================================');
      console.log('[API Config] Mode:', import.meta.env.MODE);
      console.log('[API Config] Hostname:', window.location.hostname);
      console.log('[API Config] Full URL:', window.location.href);
      console.log('[API Config] VITE_API_URL (ignored if Render):', import.meta.env.VITE_API_URL);
      console.log('[API Config] Final API URL:', cachedApiUrl);
      console.log('[API Config] ==========================================');
    }
  }
  return cachedApiUrl;
}

// Export pour compatibilité avec le code existant
export const API_URL = getApiUrlRuntime();

