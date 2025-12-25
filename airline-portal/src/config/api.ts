// Configuration centralisée de l'API
// FORCER l'URL de production pour éviter les anciennes configs Render
function getApiUrl(): string {
  // En développement local, utiliser localhost
  if (import.meta.env.MODE === 'development' || import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3000';
  }
  
  // En production, TOUJOURS utiliser api.brsats.com (ignorer VITE_API_URL si elle pointe vers Render)
  const viteUrl = import.meta.env.VITE_API_URL;
  if (viteUrl && !viteUrl.includes('onrender.com') && !viteUrl.includes('render.com')) {
    return viteUrl;
  }
  
  // URL de production par défaut
  return 'https://api.brsats.com';
}

export const API_URL = getApiUrl();

console.log('[API Config] Mode:', import.meta.env.MODE);
console.log('[API Config] Hostname:', window.location.hostname);
console.log('[API Config] VITE_API_URL from env:', import.meta.env.VITE_API_URL);
console.log('[API Config] Final API URL:', API_URL);

