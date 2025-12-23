import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { apiKeyAuth } from './middleware/auth.middleware';
import { errorHandler } from './middleware/error.middleware';
import airlinesRoutes from './routes/airlines.routes';
import airportsRoutes from './routes/airports.routes';
import authRoutes from './routes/auth.routes';
import baggageRoutes from './routes/baggage.routes';
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
import rushRoutes from './routes/rush.routes';
import statsRoutes from './routes/stats.routes';
import syncRawScansRoutes from './routes/sync-raw-scans.routes';
import userApprovalRoutes from './routes/user-approval.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Configuration CORS améliorée
const corsOptions = {
  origin: function (origin: string | undefined, callback: Function) {
    // Autoriser toutes les origines en développement, ou les origines spécifiques en production
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'];
    
    // En développement ou si aucune origine n'est spécifiée, autoriser toutes
    if (!origin || process.env.NODE_ENV !== 'production' || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Autoriser toutes les origines pour l'instant
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-airport-code', 'x-user-id'],
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
app.use('/api/v1/user-approval', apiKeyAuth, userApprovalRoutes); // Authentification - endpoint public
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
app.use('/api/v1/sync-raw-scans', apiKeyAuth, syncRawScansRoutes); // ✅ NEW: Sync raw scans to create passengers/baggages
app.use('/api/v1/export', apiKeyAuth, exportRoutes); // ✅ NEW: Export with parsing
app.use('/api/v1/airports', airportsRoutes); // Endpoint public

// 404 handler (must come before error handler)
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/2e82e369-b2c3-4892-be74-bf76a361a519',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.ts:70',message:'Server started',data:{port:PORT,env:process.env.NODE_ENV||'development'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  console.log(`Baggage Found Solution API Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

export default app;
