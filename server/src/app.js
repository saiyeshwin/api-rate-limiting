const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { protect } = require('./middleware/authMiddleware');
const { idempotencyMiddleware } = require('./middleware/idempotencyMiddleware');
const { registerUser, loginUser, getMe } = require('./controllers/authController');
const { createApi, getApis, getApiById, updateApi, deleteApi } = require('./controllers/apiController');
const { generateKey, getKeysByApi, revokeKey } = require('./controllers/keyController');
const { getDashboardSummary } = require('./controllers/dashboardController');
const { handleGatewayRequest } = require('./services/gateway');
const { startWorker, stopWorker } = require('./services/worker');
const { initKafka, disconnectKafka } = require('./config/kafka');

const app = express();

// Standard Middlewares
app.use(cors());
app.use(express.json());

// Public Auth Routes
app.post('/api/auth/register', registerUser);
app.post('/api/auth/login', loginUser);

// Protected Auth Routes
app.get('/api/auth/me', protect, getMe);

// Protected APIs CRUD Routes (with Idempotency Middleware on mutations)
app.post('/api/apis', protect, idempotencyMiddleware(), createApi);
app.get('/api/apis', protect, getApis);
app.get('/api/apis/:id', protect, getApiById);
app.put('/api/apis/:id', protect, idempotencyMiddleware(), updateApi);
app.delete('/api/apis/:id', protect, deleteApi);

// Protected API Keys Routes (with Idempotency Middleware)
app.post('/api/keys', protect, idempotencyMiddleware(), generateKey);
app.get('/api/keys/api/:apiId', protect, getKeysByApi);
app.post('/api/keys/:id/revoke', protect, idempotencyMiddleware(), revokeKey);

// Protected Dashboard Summary Route
app.get('/api/dashboard/summary', protect, getDashboardSummary);

// API Gateway Proxy Route (Supports GET, POST, PUT, DELETE, PATCH, etc.)
app.all('/gw/:apiId', idempotencyMiddleware(), handleGatewayRequest);
// Handle wildcards or optional subpaths if needed (e.g. /gw/:apiId/*)
app.all('/gw/:apiId/*', idempotencyMiddleware(), handleGatewayRequest);

// Simple Health Status for the platform itself
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'API Observability & Microservices Gateway',
    architecture: 'Microservices with Kafka Event Streaming',
    timestamp: new Date().toISOString()
  });
});

// Serve Client Static Build if present (Unified Single-Origin)
const clientDist = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/gw') || req.path.startsWith('/health')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;

// Initialize Kafka producer on boot
initKafka().catch(err => console.error('[Kafka] Initialization error:', err.message));

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`API Gateway Server running on port ${PORT}`);
  
  // Start background health checking worker (every 60 seconds)
  startWorker(60000);
});

// Graceful shutdown
const handleShutdown = async (signal) => {
  console.log(`${signal} signal received: closing HTTP server and Kafka producer`);
  stopWorker();
  await disconnectKafka();
  server.close(() => {
    console.log('HTTP server closed cleanly');
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
