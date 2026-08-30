const db = require('../config/db');

// @desc    Register a new API endpoint
// @route   POST /api/apis
const createApi = async (req, res) => {
  const { name, endpoint, method, rate_limit, rate_window, rate_limit_strategy, description } = req.body;

  if (!name || !endpoint) {
    return res.status(400).json({ error: 'Please provide API name and endpoint URL' });
  }

  // Validate endpoint format
  try {
    new URL(endpoint);
  } catch (err) {
    return res.status(400).json({ error: 'Please provide a valid endpoint URL (including protocol, e.g. https://)' });
  }

  const apiMethod = method ? method.toUpperCase().trim() : 'GET';
  const limit = rate_limit ? parseInt(rate_limit) : 60;
  const window = rate_window ? parseInt(rate_window) : 60;
  
  // Strategy Validation
  const strategy = rate_limit_strategy && ['sliding_window', 'fixed_window', 'token_bucket'].includes(rate_limit_strategy)
    ? rate_limit_strategy
    : 'sliding_window';

  try {
    const result = await db.query(
      'INSERT INTO apis (user_id, name, endpoint, method, rate_limit, rate_window, rate_limit_strategy, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [req.user.id, name.trim(), endpoint.trim(), apiMethod, limit, window, strategy, description ? description.trim() : null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating API:', error.message);
    res.status(500).json({ error: 'Server error registering API' });
  }
};

// @desc    Get all user's registered APIs with their latest health check status
// @route   GET /api/apis
const getApis = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.*, 
              hc.is_healthy, 
              hc.response_time as last_response_time, 
              hc.checked_at as last_checked_at
       FROM apis a
       LEFT JOIN LATERAL (
         SELECT is_healthy, response_time, checked_at 
         FROM health_checks 
         WHERE api_id = a.id 
         ORDER BY checked_at DESC 
         LIMIT 1
       ) hc ON TRUE
       WHERE a.user_id = $1
       ORDER BY a.created_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching APIs:', error.message);
    res.status(500).json({ error: 'Server error fetching APIs' });
  }
};

// @desc    Get details of a single API
// @route   GET /api/apis/:id
const getApiById = async (req, res) => {
  const { id } = req.params;

  try {
    const apiResult = await db.query('SELECT * FROM apis WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (apiResult.rows.length === 0) {
      return res.status(404).json({ error: 'API endpoint not found or access denied' });
    }

    const api = apiResult.rows[0];

    // Fetch the latest 10 health checks
    const healthChecks = await db.query(
      'SELECT id, status_code, response_time, is_healthy, error_message, checked_at FROM health_checks WHERE api_id = $1 ORDER BY checked_at DESC LIMIT 10',
      [id]
    );

    // Fetch recent 10 logs
    const requestsLog = await db.query(
      'SELECT id, status_code, response_time, is_violation, created_at FROM requests_log WHERE api_id = $1 ORDER BY created_at DESC LIMIT 10',
      [id]
    );

    // Calculate overall stats for this API (including P95 latency)
    const statsResult = await db.query(
      `SELECT 
         COUNT(*) as total_requests,
         SUM(CASE WHEN is_violation THEN 1 ELSE 0 END) as rate_limit_violations,
         COALESCE(AVG(CASE WHEN NOT is_violation THEN response_time ELSE NULL END), 0)::integer as avg_response_time,
         COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time) FILTER (WHERE NOT is_violation), 0)::integer as p95_response_time
       FROM requests_log
       WHERE api_id = $1`,
      [id]
    );

    const stats = statsResult.rows[0];
    const checks = healthChecks.rows;
    
    // An outage alert triggers if the last 5 health checks are consecutive failures
    const isOutageAlert = checks.length >= 5 && checks.slice(0, 5).every(c => c.is_healthy === false);

    res.json({
      ...api,
      is_outage_alert: isOutageAlert,
      recentHealthChecks: checks,
      recentRequests: requestsLog.rows,
      stats: {
        totalRequests: parseInt(stats.total_requests || 0),
        violations: parseInt(stats.rate_limit_violations || 0),
        avgResponseTime: parseInt(stats.avg_response_time || 0),
        p95ResponseTime: parseInt(stats.p95_response_time || 0)
      }
    });
  } catch (error) {
    console.error('Error fetching API details:', error.message);
    res.status(500).json({ error: 'Server error fetching API details' });
  }
};

// @desc    Update a registered API endpoint
// @route   PUT /api/apis/:id
const updateApi = async (req, res) => {
  const { id } = req.params;
  const { name, endpoint, method, rate_limit, rate_window, rate_limit_strategy, description } = req.body;

  if (!name || !endpoint) {
    return res.status(400).json({ error: 'Please provide API name and endpoint URL' });
  }

  try {
    new URL(endpoint);
  } catch (err) {
    return res.status(400).json({ error: 'Please provide a valid endpoint URL' });
  }

  const apiMethod = method ? method.toUpperCase().trim() : 'GET';
  const limit = rate_limit ? parseInt(rate_limit) : 60;
  const window = rate_window ? parseInt(rate_window) : 60;
  
  const strategy = rate_limit_strategy && ['sliding_window', 'fixed_window', 'token_bucket'].includes(rate_limit_strategy)
    ? rate_limit_strategy
    : 'sliding_window';

  try {
    const checkOwnership = await db.query('SELECT * FROM apis WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (checkOwnership.rows.length === 0) {
      return res.status(404).json({ error: 'API endpoint not found or access denied' });
    }

    const result = await db.query(
      `UPDATE apis 
       SET name = $1, endpoint = $2, method = $3, rate_limit = $4, rate_window = $5, rate_limit_strategy = $6, description = $7 
       WHERE id = $8 AND user_id = $9 
       RETURNING *`,
      [name.trim(), endpoint.trim(), apiMethod, limit, window, strategy, description ? description.trim() : null, id, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating API:', error.message);
    res.status(500).json({ error: 'Server error updating API' });
  }
};

// @desc    Delete a registered API endpoint
// @route   DELETE /api/apis/:id
const deleteApi = async (req, res) => {
  const { id } = req.params;

  try {
    const checkOwnership = await db.query('SELECT * FROM apis WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (checkOwnership.rows.length === 0) {
      return res.status(404).json({ error: 'API endpoint not found or access denied' });
    }

    await db.query('DELETE FROM apis WHERE id = $1 AND user_id = $2', [id, req.user.id]);

    res.json({ message: 'API endpoint deleted successfully' });
  } catch (error) {
    console.error('Error deleting API:', error.message);
    res.status(500).json({ error: 'Server error deleting API' });
  }
};

module.exports = {
  createApi,
  getApis,
  getApiById,
  updateApi,
  deleteApi
};
