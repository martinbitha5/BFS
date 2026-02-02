/**
 * Utilitaires pour les appels réseau avec timeout et retry
 * Améliore la robustesse en production
 */

interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number;
}

/**
 * Fetch avec timeout intégré
 * @param url - URL à appeler
 * @param options - Options fetch + timeout en ms (défaut: 10000ms)
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const { timeout = 10000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error(`Timeout après ${timeout}ms - Vérifiez votre connexion internet`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch avec retry automatique
 * @param url - URL à appeler
 * @param options - Options fetch
 * @param maxRetries - Nombre max de tentatives (défaut: 3)
 * @param retryDelay - Délai entre les tentatives en ms (défaut: 1000)
 */
export async function fetchWithRetry(
  url: string,
  options: FetchWithTimeoutOptions = {},
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options);
      
      // Si la réponse est un succès ou une erreur client (4xx), ne pas retry
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }
      
      // Erreur serveur (5xx), on peut retry
      if (attempt < maxRetries) {
        console.warn(`[Fetch] Tentative ${attempt}/${maxRetries} échouée (${response.status}), retry dans ${retryDelay}ms...`);
        await delay(retryDelay);
        continue;
      }
      
      return response;
    } catch (error: any) {
      lastError = error;
      
      // Ne pas retry sur les erreurs d'abort (timeout)
      if (error.name === 'AbortError' || error.message?.includes('Timeout')) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        console.warn(`[Fetch] Tentative ${attempt}/${maxRetries} échouée, retry dans ${retryDelay}ms...`);
        await delay(retryDelay);
      }
    }
  }

  throw lastError || new Error('Échec après plusieurs tentatives');
}

/**
 * Vérifie si l'appareil est connecté à internet
 * Note: Cette méthode est basique, en production utiliser @react-native-community/netinfo
 */
export async function isOnline(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout('https://api.brsats.com/health', {
      method: 'GET',
      timeout: 5000,
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Délai helper
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Parse une réponse JSON de manière sécurisée
 */
export async function safeJsonParse<T>(response: Response): Promise<T | null> {
  try {
    const text = await response.text();
    if (!text || text.trim() === '') {
      return null;
    }
    return JSON.parse(text) as T;
  } catch (error) {
    console.error('[Fetch] Erreur parsing JSON:', error);
    return null;
  }
}
