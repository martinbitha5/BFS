/**
 * Cache léger pour les réponses API - consultation très rapide
 * Stale-while-revalidate : retourne le cache immédiatement, rafraîchit en arrière-plan
 */

const CACHE_TTL_MS = 20000; // 20 secondes
const cache = new Map<string, { data: unknown; timestamp: number }>();

function cacheKey(url: string, options?: RequestInit): string {
  return url + (options?.body ? String(options.body) : '');
}

/**
 * Fetch avec cache. Retourne le cache instantanément si valide, sinon fetch et met en cache.
 */
export async function fetchWithCache<T = unknown>(
  url: string,
  options?: RequestInit,
  ttlMs: number = CACHE_TTL_MS
): Promise<T> {
  const key = cacheKey(url, options);
  const cached = cache.get(key);

  if (cached && Date.now() - cached.timestamp < ttlMs) {
    return cached.data as T;
  }

  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = (await response.json()) as T;
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}

/**
 * Récupère le cache sans fetch (si disponible). Pour affichage instantané.
 */
export function getCached<T = unknown>(url: string, options?: RequestInit): T | null {
  const key = cacheKey(url, options);
  const cached = cache.get(key);
  return cached ? (cached.data as T) : null;
}

/**
 * Déclenche un fetch en arrière-plan et met à jour le cache.
 * Combine avec getCached pour "stale-while-revalidate".
 */
export function refreshInBackground(
  url: string,
  options?: RequestInit,
  onUpdate?: (data: unknown) => void
): void {
  fetch(url, options)
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (data) {
        const key = cacheKey(url, options);
        cache.set(key, { data, timestamp: Date.now() });
        onUpdate?.(data);
      }
    })
    .catch(() => {});
}

/**
 * Invalide le cache pour une URL (après une modification)
 */
export function invalidateCache(urlPattern?: string): void {
  if (!urlPattern) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.includes(urlPattern)) cache.delete(key);
  }
}
