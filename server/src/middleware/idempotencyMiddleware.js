const pool = require('../config/db');
const { redis } = require('../config/redis');

/**
 * Middleware to enforce HTTP-level idempotency on mutating operations (POST, PUT, PATCH).
 * Expects 'Idempotency-Key' or 'X-Idempotency-Key' in request headers.
 */
function idempotencyMiddleware(ttlSeconds = 86400) {
  return async (req, res, next) => {
    // Only check mutating requests
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
      return next();
    }

    const idempotencyKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
    if (!idempotencyKey) {
      // If no idempotency key is provided, proceed normally
      return next();
    }

    const userId = req.user ? req.user.id : null;
    const cacheKey = `idempotency:${userId || 'anon'}:${idempotencyKey}`;

    try {
      // 1. Try checking Redis first if connected
      let cachedData = null;
      if (redis && redis.get) {
        try {
          const redisVal = await redis.get(cacheKey);
          if (redisVal) {
            cachedData = JSON.parse(redisVal);
          }
        } catch (ignored) {
        }
      }

      // 2. Fallback to PostgreSQL idempotency_keys table
      if (!cachedData) {
        const dbRes = await pool.query(
          'SELECT response_status, response_body FROM idempotency_keys WHERE key = $1 AND expires_at > CURRENT_TIMESTAMP',
          [cacheKey]
        );
        if (dbRes.rows.length > 0) {
          cachedData = {
            status: dbRes.rows[0].response_status,
            body: JSON.parse(dbRes.rows[0].response_body)
          };
        }
      }

      // 3. If cached response found, return immediately without re-executing
      if (cachedData) {
        res.setHeader('X-Idempotency-Replay', 'true');
        res.setHeader('Idempotency-Key', idempotencyKey);
        return res.status(cachedData.status).json(cachedData.body);
      }

      // 4. Intercept response to store result upon completion
      const originalJson = res.json.bind(res);
      res.json = function (body) {
        const status = res.statusCode || 200;

        // Save asynchronously so response is not delayed
        (async () => {
          try {
            const stringifiedBody = JSON.stringify(body);
            if (redis && redis.set) {
              await redis.set(cacheKey, JSON.stringify({ status, body }), 'EX', ttlSeconds);
            }
            const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
            await pool.query(
              `INSERT INTO idempotency_keys (key, user_id, request_path, response_status, response_body, expires_at)
               VALUES ($1, $2, $3, $4, $5, $6)
               ON CONFLICT (key) DO UPDATE 
               SET response_status = $4, response_body = $5, expires_at = $6`,
              [cacheKey, userId, req.originalUrl, status, stringifiedBody, expiresAt]
            );
          } catch (saveErr) {
            console.error('[Idempotency] Failed to cache response:', saveErr.message);
          }
        })();

        res.setHeader('Idempotency-Key', idempotencyKey);
        return originalJson(body);
      };

      next();
    } catch (err) {
      console.error('[Idempotency] Error checking idempotency key:', err.message);
      next();
    }
  };
}

module.exports = { idempotencyMiddleware };
