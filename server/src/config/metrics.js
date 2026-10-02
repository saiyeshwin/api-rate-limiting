const client = require('prom-client');

// Initialize default recommended Prometheus metrics (CPU, Memory, Event loop lag, GC, etc.)
const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: 'api_gateway_' });

// 1. Total HTTP Requests Counter
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests handled by the API Gateway',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// 2. HTTP Request Duration Histogram (Buckets tuned for web & API latencies in seconds)
const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Histogram of HTTP request latencies in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

// 3. Rate Limit Violations Counter
const rateLimitViolationsTotal = new client.Counter({
  name: 'rate_limit_violations_total',
  help: 'Total number of 429 rate limit breaches detected at the API Gateway',
  labelNames: ['api_id', 'endpoint'],
  registers: [register],
});

// 4. Kafka Gateway Events Emitted Counter
const kafkaEventsEmittedTotal = new client.Counter({
  name: 'kafka_events_emitted_total',
  help: 'Total number of events published to Kafka from the API Gateway',
  labelNames: ['topic', 'status'],
  registers: [register],
});

// Middleware to record request duration and status
const metricsMiddleware = (req, res, next) => {
  const start = process.hrtime();

  res.on('finish', () => {
    const elapsed = process.hrtime(start);
    const durationInSeconds = elapsed[0] + elapsed[1] / 1e9;

    // Normalize route to avoid high-cardinality paths
    let route = req.baseUrl || req.path || '/';
    if (req.route && req.route.path) {
      route = (req.baseUrl || '') + req.route.path;
    } else if (route.startsWith('/gw/')) {
      route = '/gw/:apiId';
    } else if (route.startsWith('/api/apis/')) {
      route = '/api/apis/:id';
    }

    const statusCode = res.statusCode ? res.statusCode.toString() : 'unknown';
    const method = req.method;

    httpRequestsTotal.inc({ method, route, status_code: statusCode });
    httpRequestDurationSeconds.observe({ method, route, status_code: statusCode }, durationInSeconds);

    if (statusCode === '429') {
      rateLimitViolationsTotal.inc({
        api_id: req.params && req.params.apiId ? req.params.apiId : 'unknown',
        endpoint: route,
      });
    }
  });

  next();
};

module.exports = {
  register,
  metricsMiddleware,
  httpRequestsTotal,
  httpRequestDurationSeconds,
  rateLimitViolationsTotal,
  kafkaEventsEmittedTotal,
};
