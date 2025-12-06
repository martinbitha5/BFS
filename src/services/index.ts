/**
 * Point d'entrée centralisé pour les services
 * Bascule automatiquement entre mock et réel selon la configuration
 */

import { USE_MOCK_DATA } from '../config';

// Import des services mockés
import { authServiceMock } from './auth.service.mock';
import { databaseServiceMock } from './database.service.mock';

// Import des services réels
import { authService } from './auth.service';
import { databaseService } from './database.service';

// Export conditionnel selon la configuration
export const authServiceInstance = USE_MOCK_DATA ? authServiceMock : authService;
export const databaseServiceInstance = USE_MOCK_DATA ? databaseServiceMock : databaseService;

// Services qui n'ont pas besoin de mock (parser, etc.)
export { auditService } from './audit.service';
export { birsService } from './birs.service';
export { exportService } from './export.service';
export { mockService } from './mock.service';
export { parserService } from './parser.service';
export { rushService } from './rush.service';
export { settingsService } from './settings.service';

