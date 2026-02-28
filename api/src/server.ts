import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { apiKeyAuth } from './middleware/auth.middleware';
import { errorHandler } from './middleware/error.middleware';
import accountDeletionRoutes from './routes/account-deletion.routes';
import airlineApprovalRoutes from './routes/airline-approval.routes';
import airlinesRoutes from './routes/airlines.routes';
import airportsRoutes from './routes/airports.routes';
import auditRoutes from './routes/audit.routes';
import authRoutes from './routes/auth.routes';
import baggageAuthorizationRoutes from './routes/baggage-authorization.routes';
import baggageRoutes from './routes/baggage.routes';
import { initializeBagJourneyService } from './services/bagjourney.service';
import bagJourneyRoutes from './routes/bagjourney.routes';
import birsHistoryRoutes from './routes/birs-history.routes';
import birsRoutes from './routes/birs.routes';
import boardingRoutes from './routes/boarding.routes';
import brsWorkflowRoutes from './routes/brs-workflow.routes';
import confirmRoutes from './routes/confirm.routes';
import exportRoutes from './routes/export.routes';
import flightRoutes from './routes/flights.routes';
import passengerRoutes from './routes/passenger.routes';
import publicRoutes from './routes/public.routes';
import rawScansRoutes from './routes/raw-scans.routes';
import realtimeRoutes from './routes/realtime.routes';
import rushRoutes from './routes/rush.routes';
import statsRoutes from './routes/stats.routes';
import supportRoutes from './routes/support.routes';
import syncRawScansRoutes from './routes/sync-raw-scans.routes';
import userApprovalRoutes from './routes/user-approval.routes';
import usersRoutes from './routes/users.routes';

dotenv.config();

// Initialiser le service BagJourney si configuré
if (process.env.BAGJOURNEY_API_KEY && process.env.BAGJOURNEY_BASE_URL) {
  try {
    initializeBagJourneyService({
      apiKey: process.env.BAGJOURNEY_API_KEY,
      baseUrl: process.env.BAGJOURNEY_BASE_URL,
      timeout: Number(process.env.BAGJOURNEY_TIMEOUT) || 30000,
    });
    console.log('✅ BagJourney service initialized');
  } catch (error) {
    console.warn('⚠️  Failed to initialize BagJourney service:', error);
  }
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Configuration CORS améliorée
const corsOptions = {
  origin: function (origin: string | undefined, callback: Function) {
    // Autoriser toutes les origines en développement, ou les origines spécifiques en production
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'];
    
    // En développement, autoriser toutes les origines
    if (process.env.NODE_ENV !== 'production') {
      callback(null, true);
      return;
    }
    
    // En production, autoriser les origines de la liste ou si aucune origine (requêtes depuis le même domaine)
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.some(allowed => origin.includes(allowed))) {
      callback(null, true);
    } else {
      // Log pour debug en production
      if (process.env.NODE_ENV === 'production') {
        console.warn(`⚠️  CORS: Origine non autorisée: ${origin}. Origines autorisées: ${allowedOrigins.join(', ')}`);
      }
      callback(null, true); // Autoriser pour l'instant, mais loguer l'avertissement
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-airport-code', 'x-user-id', 'x-user-role', 'x-airline-code'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200 // Pour les anciens navigateurs
};

app.use(cors(corsOptions));

// Gérer explicitement les requêtes OPTIONS (preflight)
app.options('*', cors(corsOptions));

app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/v1/confirm', confirmRoutes); // Confirmation email - endpoint public
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/auth', accountDeletionRoutes); // Account deletion requests - endpoint public
app.use('/api/v1/user-approval', apiKeyAuth, userApprovalRoutes); // Approbation utilisateurs - nécessite auth
app.use('/api/v1/airline-approval', apiKeyAuth, airlineApprovalRoutes); // Approbation airlines - nécessite auth
app.use('/api/v1/baggage-authorization', apiKeyAuth, baggageAuthorizationRoutes); // Autorisation bagages supplémentaires - nécessite auth support
app.use('/api/v1/public', publicRoutes); // ✅ NEW: Tracking passagers - endpoint public
app.use('/api/v1/airlines', airlinesRoutes); // ✅ NEW: Auth compagnies aériennes - endpoint public
app.use('/api/v1/birs/history', birsHistoryRoutes); // ✅ NEW: Historique BIRS pour compagnies
app.use('/api/v1/baggage', apiKeyAuth, baggageRoutes);
app.use('/api/v1/passengers', apiKeyAuth, passengerRoutes);
app.use('/api/v1/boarding', apiKeyAuth, boardingRoutes);
app.use('/api/v1/stats', apiKeyAuth, statsRoutes);
app.use('/api/v1/flights', apiKeyAuth, flightRoutes);
app.use('/api/v1/birs', apiKeyAuth, birsRoutes);
app.use('/api/v1/brs', apiKeyAuth, brsWorkflowRoutes); // ✅ NEW: Workflow BRS complet
app.use('/api/v1/rush', apiKeyAuth, rushRoutes);
app.use('/api/v1/raw-scans', apiKeyAuth, rawScansRoutes); // ✅ NEW: Raw scans
app.use('/api/v1/sync-raw-scans', syncRawScansRoutes); // ✅ Sync raw scans - sans auth pour debug
app.use('/api/v1/export', apiKeyAuth, exportRoutes); // ✅ NEW: Export with parsing
app.use('/api/v1/users', apiKeyAuth, usersRoutes); // ✅ NEW: Gestion des utilisateurs
app.use('/api/v1/audit', apiKeyAuth, auditRoutes); // ✅ NEW: Logs d'audit
app.use('/api/v1/support', apiKeyAuth, supportRoutes); // ✅ NEW: Routes support (bagages, utilisateurs, stats)
app.use('/api/v1/airports', airportsRoutes); // Endpoint public
app.use('/api/v1/realtime', realtimeRoutes); // ✅ NEW: SSE temps réel (auth via query params pour EventSource)
app.use('/api/v1/bagjourney', apiKeyAuth, bagJourneyRoutes); // ✅ NEW: Intégration BagJourney SITA

// 404 handler (must come before error handler)
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling (must be last)
app.use(errorHandler);

// Écouter sur toutes les interfaces (0.0.0.0) pour permettre à Nginx de se connecter
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Baggage Found Solution API Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 Server ready to accept connections on 0.0.0.0:${PORT}`);
});

export default app;
