/**
 * Utilitaires pour créer des checksums simples
 * Utilisé pour identifier les boarding pass sans envoyer le rawData
 */

/**
 * Crée un checksum simple du raw data
 * Basé sur la longueur et un hash simple (pas SHA256, mais suffisant pour identifier)
 * 
 * Format: length_timestamp_hash
 * Exemple: "450_1705600123_42f7e8c9"
 */
export function createScanChecksum(rawData: string): string {
  // 1. Longueur du raw data
  const length = rawData.length;

  // 2. Timestamp (pour l'unicité)
  const timestamp = Math.floor(Date.now() / 1000);

  // 3. Simple hash basé sur la somme des codes de caractères (rapide, pas crypto)
  let hash = 0;
  for (let i = 0; i < rawData.length; i++) {
    const char = rawData.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convertir en 32-bit int
  }
  const hashHex = Math.abs(hash).toString(16);

  // Combiner pour créer un identifiant unique
  return `${length}_${timestamp}_${hashHex}`;
}

/**
 * Extrait les premières et dernières lettres du raw data pour identification
 * Exemple: "M1RAZIOU...0009" → "M1RAZII0009"
 */
export function createScanSignature(rawData: string): string {
  if (rawData.length < 10) return rawData;
  
  // Prendre les 8 premiers chars et les 6 derniers
  const prefix = rawData.substring(0, 8);
  const suffix = rawData.substring(rawData.length - 6);
  
  return `${prefix}...${suffix}`;
}

/**
 * Crée un ID simple basé sur les informations extraites
 * Utilise PNR + Nom + Vol pour identifier l'embarquement
 */
export function createBoardingIdentifier(pnr: string, fullName: string, flightNumber: string): string {
  // Format: PNR_LASTNAME_FLIGHT
  const namePart = fullName
    .split('/')[0] // Prendre seulement le lastname
    .substring(0, 6)
    .toUpperCase();
  
  return `${pnr}_${namePart}_${flightNumber}`;
}
