/**
 * Point d'entrée centralisé pour les services
 * Configuration production - utilise uniquement les vrais services
 */

// Import des services réels (sans dépendances circulaires)
import { authService } from './auth.service';
import { databaseService } from './database.service';

// Export des services de production
export const authServiceInstance = authService;
export const databaseServiceInstance = databaseService;

// Autres services - exports directs pour éviter les dépendances circulaires
export { auditService } from './audit.service';
export { birsService } from './birs.service';
export { boardingService } from './boarding.service';
export { exportService } from './export.service';
export { parserService } from './parser.service';
export { rawScanService } from './raw-scan.service';
export { rushService } from './rush.service';
export { settingsService } from './settings.service';
export { syncService } from './sync.service';

// flightService est exporté en dernier pour éviter les dépendances circulaires
export { flightService } from './flight.service';

