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
import confirmRoutes from './routes/confirm.routes';
import exportRoutes from './routes/export.routes';
import flightRoutes from './routes/flights.routes';
import passengerRoutes from './routes/passenger.routes';
import rawScansRoutes from './routes/raw-scans.routes';
import rushRoutes from './routes/rush.routes';
import statsRoutes from './routes/stats.routes';
import syncRawScansRoutes from './routes/sync-raw-scans.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: '*',  // Allow all origins for development
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/v1/confirm', confirmRoutes); // Confirmation email - endpoint public
app.use('/api/v1/auth', authRoutes); // Authentification - endpoint public
app.use('/api/v1/airlines', airlinesRoutes); // ✅ NEW: Auth compagnies aériennes - endpoint public
app.use('/api/v1/birs/history', birsHistoryRoutes); // ✅ NEW: Historique BIRS pour compagnies
app.use('/api/v1/baggage', apiKeyAuth, baggageRoutes);
app.use('/api/v1/passengers', apiKeyAuth, passengerRoutes);
app.use('/api/v1/boarding', apiKeyAuth, boardingRoutes);
app.use('/api/v1/stats', apiKeyAuth, statsRoutes);
app.use('/api/v1/flights', apiKeyAuth, flightRoutes);
app.use('/api/v1/birs', apiKeyAuth, birsRoutes);
app.use('/api/v1/rush', apiKeyAuth, rushRoutes);
app.use('/api/v1/raw-scans', apiKeyAuth, rawScansRoutes); // ✅ NEW: Raw scans
app.use('/api/v1/sync-raw-scans', apiKeyAuth, syncRawScansRoutes); // ✅ NEW: Sync raw scans to create passengers/baggages
app.use('/api/v1/export', apiKeyAuth, exportRoutes); // ✅ NEW: Export with parsing
app.use('/api/v1/airports', airportsRoutes); // Endpoint public

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Baggage Found Solution API Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

export default app;
