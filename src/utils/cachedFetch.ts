/**
 * Fetch avec cache pour les consultations GET - réponses très rapides
 * Cache 12 secondes : même requête = réponse instantanée
 */

const CACHE_TTL_MS = 12000; // 12 secondes
const cache = new Map<string, { body: string; status: number; timestamp: number }>();

function isGet(options?: RequestInit): boolean {
  return !options?.method || options.method.toUpperCase() === 'GET';
}

/**
 * Fetch avec cache pour les requêtes GET.
 * POST/PUT/DELETE : pas de cache, fetch normal.
 */
export async function cachedFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  if (!isGet(options)) {
    return fetch(url, options);
  }

  const key = url;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return new Response(cached.body, { status: cached.status });
  }

  const response = await fetch(url, options);
  try {
    const clone = response.clone();
    const body = await clone.text();
    if (response.ok) {
      cache.set(key, { body, status: response.status, timestamp: Date.now() });
    }
  } catch {
    // Ignorer erreur de clone/read
  }
  return response;
}

/** Invalide le cache (après modification de données) */
export function invalidateCache(pattern?: string): void {
  if (!pattern) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.includes(pattern)) cache.delete(key);
  }
}
