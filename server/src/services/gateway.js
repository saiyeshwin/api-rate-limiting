const axios = require('axios');
const crypto = require('crypto');
const db = require('../config/db');
const { checkRateLimit } = require('../config/redis');

// @desc    API Gateway Proxy Route
// @route   ALL /gw/:apiId
const handleGatewayRequest = async (req, res) => {
  const { apiId } = req.params;
  const apiKey = req.headers['x-api-key'] || req.headers['X-API-Key'];

  if (!apiKey) {
    return res.status(401).json({ error: 'Authentication failed: Missing X-API-Key header' });
  }

  // Hash the incoming key for DB lookup
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

  let api = null;
  try {
    // 1. Fetch API configuration
    const apiResult = await db.query('SELECT * FROM apis WHERE id = $1', [apiId]);
    if (apiResult.rows.length === 0) {
      return res.status(404).json({ error: 'Gateway Routing Error: API endpoint not registered' });
    }
    api = apiResult.rows[0];

    // 2. Validate API Key
    const keyResult = await db.query(
      'SELECT id, revoked_at FROM api_keys WHERE key_hash = $1 AND api_id = $2',
      [keyHash, apiId]
    );

    if (keyResult.rows.length === 0) {
      return res.status(401).json({ error: 'Authentication failed: Invalid API key' });
    }

    const apiKeyRecord = keyResult.rows[0];
    if (apiKeyRecord.revoked_at !== null) {
      return res.status(401).json({ error: 'Authentication failed: API key has been revoked' });
    }

    // 3. Apply Configured Rate Limiting Strategy
    const rateLimitKey = `rate_limit:${apiId}:${keyHash}`;
    const rateCheck = await checkRateLimit(rateLimitKey, api.rate_limit, api.rate_window, api.rate_limit_strategy);

    // Set standard rate limiting response headers
    res.setHeader('X-RateLimit-Limit', api.rate_limit);
    res.setHeader('X-RateLimit-Remaining', rateCheck.remaining);
    res.setHeader('X-RateLimit-Reset', rateCheck.reset);
    res.setHeader('X-RateLimit-Strategy', api.rate_limit_strategy);

    if (!rateCheck.allowed) {
      res.setHeader('Retry-After', rateCheck.reset);
      
      // Log Rate Limit Violation
      await db.query(
        'INSERT INTO requests_log (api_id, status_code, response_time, is_violation) VALUES ($1, $2, $3, $4)',
        [apiId, 429, 0, true]
      );

      return res.status(429).json({
        error: 'Too Many Requests',
        message: `API rate limit exceeded. Limit is ${api.rate_limit} requests per ${api.rate_window}s.`,
        retry_after_seconds: rateCheck.reset
      });
    }

    // 4. Proxy the Request
    const startTime = Date.now();
    
    // Construct proxy request configuration
    const headers = { ...req.headers };
    // Remove gateway specific headers to avoid exposing them to target
    delete headers['x-api-key'];
    delete headers['host'];
    delete headers['connection'];

    // Forward the original query parameters and request body
    const proxyConfig = {
      method: req.method,
      url: api.endpoint,
      params: req.query,
      data: req.body,
      headers: headers,
      timeout: 10000, // 10 seconds timeout
      validateStatus: () => true // Allow proxying any status code (2xx, 4xx, 5xx)
    };

    let response;
    try {
      response = await axios(proxyConfig);
    } catch (proxyError) {
      // Handle connection error, timeout, DNS resolution failure
      const latency = Date.now() - startTime;
      const statusCode = proxyError.response ? proxyError.response.status : 504; // Gateway Timeout
      const errorMessage = proxyError.message || 'Unknown network error';

      await db.query(
        'INSERT INTO requests_log (api_id, status_code, response_time, is_violation) VALUES ($1, $2, $3, $4)',
        [apiId, statusCode, latency, false]
      );

      console.error(`Gateway proxy error to ${api.endpoint}:`, errorMessage);
      return res.status(statusCode).json({
        error: 'Bad Gateway',
        message: `Failed to connect to upstream API: ${errorMessage}`
      });
    }

    const latency = Date.now() - startTime;

    // 5. Log Request Details
    await db.query(
      'INSERT INTO requests_log (api_id, status_code, response_time, is_violation) VALUES ($1, $2, $3, $4)',
      [apiId, response.status, latency, false]
    );

    // 6. Forward Upstream Response to Client
    // Set headers from upstream response if safe (excluding upstream rate-limiting headers)
    Object.keys(response.headers).forEach(header => {
      const lower = header.toLowerCase();
      if (
        lower !== 'content-encoding' && 
        lower !== 'transfer-encoding' &&
        !lower.includes('ratelimit')
      ) {
        res.setHeader(header, response.headers[header]);
      }
    });

    res.status(response.status).send(response.data);

  } catch (error) {
    console.error('Unexpected Gateway Error:', error.message);
    res.status(500).json({ error: 'Internal Gateway Error' });
  }
};

module.exports = {
  handleGatewayRequest
};
