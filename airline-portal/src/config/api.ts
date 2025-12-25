// Configuration centralisée de l'API
// FORCER l'URL de production pour éviter les anciennes configs Render
function getApiUrl(): string {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  
  // En développement local, utiliser localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
    return 'http://localhost:3000';
  }
  
  // En production sur airline-portal.brsats.com, TOUJOURS utiliser api.brsats.com
  // Ignorer complètement VITE_API_URL si elle contient Render
  if (hostname.includes('brsats.com') || hostname.includes('airline-portal')) {
    return 'https://api.brsats.com';
  }
  
  // Si VITE_API_URL est définie et ne pointe PAS vers Render, l'utiliser
  const viteUrl = import.meta.env.VITE_API_URL;
  if (viteUrl && typeof viteUrl === 'string' && !viteUrl.includes('onrender.com') && !viteUrl.includes('render.com')) {
    return viteUrl;
  }
  
  // URL de production par défaut (TOUJOURS api.brsats.com)
  return 'https://api.brsats.com';
}

export const API_URL = getApiUrl();

// Logs pour debug
if (typeof window !== 'undefined') {
  console.log('[API Config] Mode:', import.meta.env.MODE);
  console.log('[API Config] Hostname:', window.location.hostname);
  console.log('[API Config] Final API URL:', API_URL);
}

