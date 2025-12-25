// Configuration centralisée de l'API
// Utilise VITE_API_URL si défini, sinon détecte automatiquement l'environnement
export const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.MODE === 'development' || import.meta.env.DEV 
    ? 'http://localhost:3000' 
    : 'https://api.brsats.com');

console.log('[API Config] Mode:', import.meta.env.MODE);
console.log('[API Config] API URL:', API_URL);

