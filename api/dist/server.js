"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const auth_middleware_1 = require("./middleware/auth.middleware");
const error_middleware_1 = require("./middleware/error.middleware");
const account_deletion_routes_1 = __importDefault(require("./routes/account-deletion.routes"));
const airline_approval_routes_1 = __importDefault(require("./routes/airline-approval.routes"));
const airlines_routes_1 = __importDefault(require("./routes/airlines.routes"));
const airports_routes_1 = __importDefault(require("./routes/airports.routes"));
const audit_routes_1 = __importDefault(require("./routes/audit.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const baggage_authorization_routes_1 = __importDefault(require("./routes/baggage-authorization.routes"));
const baggage_routes_1 = __importDefault(require("./routes/baggage.routes"));
const birs_history_routes_1 = __importDefault(require("./routes/birs-history.routes"));
const birs_routes_1 = __importDefault(require("./routes/birs.routes"));
const boarding_routes_1 = __importDefault(require("./routes/boarding.routes"));
const brs_workflow_routes_1 = __importDefault(require("./routes/brs-workflow.routes"));
const confirm_routes_1 = __importDefault(require("./routes/confirm.routes"));
const export_routes_1 = __importDefault(require("./routes/export.routes"));
const flights_routes_1 = __importDefault(require("./routes/flights.routes"));
const passenger_routes_1 = __importDefault(require("./routes/passenger.routes"));
const public_routes_1 = __importDefault(require("./routes/public.routes"));
const raw_scans_routes_1 = __importDefault(require("./routes/raw-scans.routes"));
const realtime_routes_1 = __importDefault(require("./routes/realtime.routes"));
const rush_routes_1 = __importDefault(require("./routes/rush.routes"));
const stats_routes_1 = __importDefault(require("./routes/stats.routes"));
const support_routes_1 = __importDefault(require("./routes/support.routes"));
const sync_raw_scans_routes_1 = __importDefault(require("./routes/sync-raw-scans.routes"));
const user_approval_routes_1 = __importDefault(require("./routes/user-approval.routes"));
const users_routes_1 = __importDefault(require("./routes/users.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT) || 3000;
// Middleware
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
// Configuration CORS améliorée
const corsOptions = {
    origin: function (origin, callback) {
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
        }
        else {
            // Log pour debug en production
            if (process.env.NODE_ENV === 'production') {
                console.warn(`⚠️  CORS: Origine non autorisée: ${origin}. Origines autorisées: ${allowedOrigins.join(', ')}`);
            }
            callback(null, true); // Autoriser pour l'instant, mais loguer l'avertissement
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-airport-code', 'x-user-id', 'x-user-role'],
    exposedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200 // Pour les anciens navigateurs
};
app.use((0, cors_1.default)(corsOptions));
// Gérer explicitement les requêtes OPTIONS (preflight)
app.options('*', (0, cors_1.default)(corsOptions));
app.use((0, morgan_1.default)('combined'));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
// Routes
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use('/api/v1/confirm', confirm_routes_1.default); // Confirmation email - endpoint public
app.use('/api/v1/auth', auth_routes_1.default);
app.use('/api/v1/auth', account_deletion_routes_1.default); // Account deletion requests - endpoint public
app.use('/api/v1/user-approval', auth_middleware_1.apiKeyAuth, user_approval_routes_1.default); // Approbation utilisateurs - nécessite auth
app.use('/api/v1/airline-approval', auth_middleware_1.apiKeyAuth, airline_approval_routes_1.default); // Approbation airlines - nécessite auth
app.use('/api/v1/baggage-authorization', auth_middleware_1.apiKeyAuth, baggage_authorization_routes_1.default); // Autorisation bagages supplémentaires - nécessite auth support
app.use('/api/v1/public', public_routes_1.default); // ✅ NEW: Tracking passagers - endpoint public
app.use('/api/v1/airlines', airlines_routes_1.default); // ✅ NEW: Auth compagnies aériennes - endpoint public
app.use('/api/v1/birs/history', birs_history_routes_1.default); // ✅ NEW: Historique BIRS pour compagnies
app.use('/api/v1/baggage', auth_middleware_1.apiKeyAuth, baggage_routes_1.default);
app.use('/api/v1/passengers', auth_middleware_1.apiKeyAuth, passenger_routes_1.default);
app.use('/api/v1/boarding', auth_middleware_1.apiKeyAuth, boarding_routes_1.default);
app.use('/api/v1/stats', auth_middleware_1.apiKeyAuth, stats_routes_1.default);
app.use('/api/v1/flights', auth_middleware_1.apiKeyAuth, flights_routes_1.default);
app.use('/api/v1/birs', auth_middleware_1.apiKeyAuth, birs_routes_1.default);
app.use('/api/v1/brs', auth_middleware_1.apiKeyAuth, brs_workflow_routes_1.default); // ✅ NEW: Workflow BRS complet
app.use('/api/v1/rush', auth_middleware_1.apiKeyAuth, rush_routes_1.default);
app.use('/api/v1/raw-scans', auth_middleware_1.apiKeyAuth, raw_scans_routes_1.default); // ✅ NEW: Raw scans
app.use('/api/v1/sync-raw-scans', sync_raw_scans_routes_1.default); // ✅ Sync raw scans - sans auth pour debug
app.use('/api/v1/export', auth_middleware_1.apiKeyAuth, export_routes_1.default); // ✅ NEW: Export with parsing
app.use('/api/v1/users', auth_middleware_1.apiKeyAuth, users_routes_1.default); // ✅ NEW: Gestion des utilisateurs
app.use('/api/v1/audit', auth_middleware_1.apiKeyAuth, audit_routes_1.default); // ✅ NEW: Logs d'audit
app.use('/api/v1/support', auth_middleware_1.apiKeyAuth, support_routes_1.default); // ✅ NEW: Routes support (bagages, utilisateurs, stats)
app.use('/api/v1/airports', airports_routes_1.default); // Endpoint public
app.use('/api/v1/realtime', realtime_routes_1.default); // ✅ NEW: SSE temps réel (auth via query params pour EventSource)
// 404 handler (must come before error handler)
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
// Error handling (must be last)
app.use(error_middleware_1.errorHandler);
// Écouter sur toutes les interfaces (0.0.0.0) pour permettre à Nginx de se connecter
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Baggage Found Solution API Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`🌐 Server ready to accept connections on 0.0.0.0:${PORT}`);
});
exports.default = app;
