import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import baggageRoutes from './routes/baggage.routes';
import passengerRoutes from './routes/passenger.routes';
import statsRoutes from './routes/stats.routes';
import flightRoutes from './routes/flight.routes';
import birsRoutes from './routes/birs.routes';
import rushRoutes from './routes/rush.routes';
import airportsRoutes from './routes/airports.routes';
import authRoutes from './routes/auth.routes';
import boardingRoutes from './routes/boarding.routes';
import { errorHandler } from './middleware/error.middleware';
import { apiKeyAuth } from './middleware/auth.middleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/v1/auth', authRoutes); // Authentification - endpoint public
app.use('/api/v1/baggage', apiKeyAuth, baggageRoutes);
app.use('/api/v1/passengers', apiKeyAuth, passengerRoutes);
app.use('/api/v1/boarding', apiKeyAuth, boardingRoutes);
app.use('/api/v1/stats', apiKeyAuth, statsRoutes);
app.use('/api/v1/flights', apiKeyAuth, flightRoutes);
app.use('/api/v1/birs', apiKeyAuth, birsRoutes);
app.use('/api/v1/rush', apiKeyAuth, rushRoutes);
app.use('/api/v1/airports', airportsRoutes); // Endpoint public

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`BFS API Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

export default app;
