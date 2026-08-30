const Redis = require('ioredis');
require('dotenv').config();

const LUA_SLIDING_WINDOW = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local clearBefore = now - window

redis.call('ZREMRANGEBYSCORE', key, 0, clearBefore)
local currentRequests = redis.call('ZCARD', key)

if currentRequests < limit then
    redis.call('ZADD', key, now, now)
    redis.call('EXPIRE', key, math.ceil(window / 1000))
    return {1, limit - currentRequests - 1}
else
    return {0, 0}
end
`;

const LUA_TOKEN_BUCKET = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refillRateMs = tonumber(ARGV[2]) -- tokens per millisecond
local now = tonumber(ARGV[3]) -- timestamp in ms

local data = redis.call('HMGET', key, 'tokens', 'last_updated')
local tokens = tonumber(data[1])
local lastUpdated = tonumber(data[2])

if not tokens then
    tokens = capacity
    lastUpdated = now
else
    local elapsed = now - lastUpdated
    if elapsed > 0 then
        tokens = math.min(capacity, tokens + (elapsed * refillRateMs))
        lastUpdated = now
    end
end

if tokens >= 1 then
    tokens = tokens - 1
    redis.call('HMSET', key, 'tokens', tokens, 'last_updated', lastUpdated)
    redis.call('EXPIRE', key, 3600) -- Expire after an hour of inactivity
    return {1, tokens}
else
    redis.call('HMSET', key, 'tokens', tokens, 'last_updated', lastUpdated)
    return {0, tokens}
end
`;

class MockRedisClient {
  constructor() {
    this.store = new Map(); // Generic store
    console.log("Mock Redis (In-Memory) Rate Limiter initialized");
  }

  async checkRateLimit(key, limit, windowSeconds, strategy = 'sliding_window') {
    const now = Date.now();

    if (strategy === 'fixed_window') {
      const nowSec = Math.floor(now / 1000);
      const windowId = Math.floor(nowSec / windowSeconds);
      const subKey = `${key}:fixed:${windowId}`;

      if (!this.store.has(subKey)) {
        this.store.set(subKey, 0);
        // Expiry cleanup
        setTimeout(() => this.store.delete(subKey), windowSeconds * 1000);
      }

      let count = this.store.get(subKey) + 1;
      this.store.set(subKey, count);

      const allowed = count <= limit;
      const remaining = Math.max(0, limit - count);
      const reset = (windowId + 1) * windowSeconds - nowSec;

      return { allowed, remaining, reset };
    } 
    
    if (strategy === 'token_bucket') {
      const subKey = `${key}:token_bucket`;
      const refillRateMs = limit / (windowSeconds * 1000);

      if (!this.store.has(subKey)) {
        this.store.set(subKey, { tokens: limit, lastUpdated: now });
      }

      let bucket = this.store.get(subKey);
      let elapsed = now - bucket.lastUpdated;
      let tokens = bucket.tokens;

      if (elapsed > 0) {
        tokens = Math.min(limit, tokens + elapsed * refillRateMs);
        bucket.lastUpdated = now;
      }

      if (tokens >= 1) {
        tokens = tokens - 1;
        bucket.tokens = tokens;
        this.store.set(subKey, bucket);

        if (bucket.timeoutId) clearTimeout(bucket.timeoutId);
        bucket.timeoutId = setTimeout(() => this.store.delete(subKey), 3600 * 1000);

        return {
          allowed: true,
          remaining: Math.floor(tokens),
          reset: Math.ceil(windowSeconds)
        };
      } else {
        bucket.tokens = tokens;
        this.store.set(subKey, bucket);

        const timeToRefillOneToken = Math.ceil((1 - tokens) / refillRateMs / 1000);
        return {
          allowed: false,
          remaining: 0,
          reset: Math.max(1, timeToRefillOneToken)
        };
      }
    }

    // Default: sliding_window
    const windowMs = windowSeconds * 1000;
    const clearBefore = now - windowMs;

    if (!this.store.has(key)) {
      this.store.set(key, []);
    }

    let timestamps = this.store.get(key);
    timestamps = timestamps.filter(t => t > clearBefore);

    if (timestamps.length < limit) {
      timestamps.push(now);
      this.store.set(key, timestamps);
      
      setTimeout(() => {
        let current = this.store.get(key);
        if (current) {
          current = current.filter(t => t > Date.now() - windowMs);
          if (current.length === 0) {
            this.store.delete(key);
          } else {
            this.store.set(key, current);
          }
        }
      }, windowMs);

      return {
        allowed: true,
        remaining: limit - timestamps.length,
        reset: windowSeconds
      };
    } else {
      const oldestTimestamp = timestamps[0];
      const resetTime = Math.max(1, Math.ceil((oldestTimestamp + windowMs - now) / 1000));
      return {
        allowed: false,
        remaining: 0,
        reset: resetTime
      };
    }
  }
}

const mockClient = new MockRedisClient();
let redisClient = null;
let useMock = process.env.USE_MOCK_REDIS === 'true';

if (!useMock) {
  try {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      retryStrategy: () => null
    });
    
    redisClient.on('error', (err) => {
      console.warn("Redis connection failed, using in-memory mock client. Reason:", err.message);
      useMock = true;
    });

    redisClient.on('connect', () => {
      console.log('Connected to Redis server for Rate Limiting');
    });
  } catch (err) {
    console.warn("Failed to create Redis client, using in-memory mock. Reason:", err.message);
    useMock = true;
  }
}

async function checkRateLimit(key, limit, windowSeconds, strategy = 'sliding_window') {
  if (useMock || !redisClient || redisClient.status !== 'ready') {
    return mockClient.checkRateLimit(key, limit, windowSeconds, strategy);
  }

  try {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    if (strategy === 'fixed_window') {
      const nowSec = Math.floor(now / 1000);
      const windowId = Math.floor(nowSec / windowSeconds);
      const subKey = `${key}:fixed:${windowId}`;

      const count = await redisClient.incr(subKey);
      if (count === 1) {
        await redisClient.expire(subKey, windowSeconds);
      }

      const allowed = count <= limit;
      const remaining = Math.max(0, limit - count);
      const reset = (windowId + 1) * windowSeconds - nowSec;

      return { allowed, remaining, reset };
    }

    if (strategy === 'token_bucket') {
      const subKey = `${key}:token_bucket`;
      const refillRateMs = limit / (windowSeconds * 1000);

      const result = await redisClient.eval(
        LUA_TOKEN_BUCKET,
        1,
        subKey,
        limit.toString(),
        refillRateMs.toString(),
        now.toString()
      );

      const allowed = result[0] === 1;
      const tokens = result[1];
      const remaining = Math.floor(tokens);
      
      let reset = windowSeconds;
      if (!allowed) {
        reset = Math.max(1, Math.ceil((1 - tokens) / refillRateMs / 1000));
      }

      return { allowed, remaining, reset };
    }

    // Default: sliding_window
    const result = await redisClient.eval(
      LUA_SLIDING_WINDOW,
      1,
      key,
      now.toString(),
      windowMs.toString(),
      limit.toString()
    );

    const allowed = result[0] === 1;
    const remaining = result[1];
    
    let reset = windowSeconds;
    if (!allowed) {
      const range = await redisClient.zrange(key, 0, 0, 'WITHSCORES');
      if (range && range[1]) {
        const oldestTimestamp = parseInt(range[1]);
        reset = Math.max(1, Math.ceil((oldestTimestamp + windowMs - now) / 1000));
      }
    }

    return {
      allowed,
      remaining,
      reset
    };
  } catch (err) {
    console.error(`Redis rate limit check failed for strategy ${strategy}, falling back to mock client:`, err.message);
    return mockClient.checkRateLimit(key, limit, windowSeconds, strategy);
  }
}

module.exports = {
  checkRateLimit,
  redisClient
};
