const db = require('../config/db');

// @desc    Get aggregated dashboard summary metrics & charts
// @route   GET /api/dashboard/summary
const getDashboardSummary = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Get counts of healthy vs unhealthy APIs (using LATERAL join or DISTINCT ON)
    const apiHealthStats = await db.query(
      `WITH latest_checks AS (
         SELECT DISTINCT ON (api_id) api_id, is_healthy
         FROM health_checks
         ORDER BY api_id, checked_at DESC
       )
       SELECT 
         COUNT(a.id) as total_apis,
         COALESCE(SUM(CASE WHEN lc.is_healthy = TRUE THEN 1 ELSE 0 END), 0) as healthy_apis,
         COALESCE(SUM(CASE WHEN lc.is_healthy = FALSE THEN 1 ELSE 0 END), 0) as unhealthy_apis,
         COALESCE(SUM(CASE WHEN lc.is_healthy IS NULL THEN 1 ELSE 0 END), 0) as unknown_apis
       FROM apis a
       LEFT JOIN latest_checks lc ON a.id = lc.api_id
       WHERE a.user_id = $1`,
      [userId]
    );

    const healthStats = apiHealthStats.rows[0] || { total_apis: 0, healthy_apis: 0, unhealthy_apis: 0, unknown_apis: 0 };

    // 2. Get total requests, rate limit violations, average latency, and P95 latency
    const apiRequestStats = await db.query(
      `SELECT 
         COUNT(l.id) as total_requests,
         COALESCE(SUM(CASE WHEN l.is_violation = TRUE THEN 1 ELSE 0 END), 0) as rate_limit_violations,
         COALESCE(AVG(CASE WHEN NOT l.is_violation THEN l.response_time ELSE NULL END), 0)::integer as avg_latency,
         COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY l.response_time) FILTER (WHERE NOT l.is_violation), 0)::integer as p95_latency
       FROM requests_log l
       JOIN apis a ON l.api_id = a.id
       WHERE a.user_id = $1`,
      [userId]
    );

    const requestStats = apiRequestStats.rows[0] || { total_requests: 0, rate_limit_violations: 0, avg_latency: 0, p95_latency: 0 };

    // 3. Get time-series charts data (hourly requests and latency for the last 24 hours)
    const timeSeriesData = await db.query(
      `SELECT 
         TO_CHAR(DATE_TRUNC('hour', l.created_at), 'YYYY-MM-DD HH24:00') as hour,
         COUNT(l.id) as request_count,
         SUM(CASE WHEN l.is_violation = TRUE THEN 1 ELSE 0 END) as violations,
         COALESCE(ROUND(AVG(CASE WHEN NOT l.is_violation THEN l.response_time ELSE NULL END), 0), 0) as avg_response_time
       FROM requests_log l
       JOIN apis a ON l.api_id = a.id
       WHERE a.user_id = $1 AND l.created_at >= NOW() - INTERVAL '24 hours'
       GROUP BY DATE_TRUNC('hour', l.created_at)
       ORDER BY DATE_TRUNC('hour', l.created_at) ASC`,
      [userId]
    );

    // 4. Get recent logs (10 most recent gateway requests)
    const recentRequests = await db.query(
      `SELECT l.id, a.name as api_name, a.id as api_id, l.status_code, l.response_time, l.is_violation, l.created_at
       FROM requests_log l
       JOIN apis a ON l.api_id = a.id
       WHERE a.user_id = $1
       ORDER BY l.created_at DESC
       LIMIT 10`,
      [userId]
    );

    // 5. Get recent health failures or recent check logs
    const recentHealthChecks = await db.query(
      `SELECT hc.id, a.name as api_name, a.id as api_id, hc.status_code, hc.response_time, hc.is_healthy, hc.error_message, hc.checked_at
       FROM health_checks hc
       JOIN apis a ON hc.api_id = a.id
       WHERE a.user_id = $1
       ORDER BY hc.checked_at DESC
       LIMIT 10`,
      [userId]
    );

    res.json({
      summary: {
        totalApis: parseInt(healthStats.total_apis || 0),
        healthyApis: parseInt(healthStats.healthy_apis || 0),
        unhealthyApis: parseInt(healthStats.unhealthy_apis || 0),
        unknownApis: parseInt(healthStats.unknown_apis || 0),
        totalRequests: parseInt(requestStats.total_requests || 0),
        violations: parseInt(requestStats.rate_limit_violations || 0),
        avgLatencyMs: parseInt(requestStats.avg_latency || 0),
        p95LatencyMs: parseInt(requestStats.p95_latency || 0)
      },
      chartData: timeSeriesData.rows,
      recentRequests: recentRequests.rows,
      recentHealthChecks: recentHealthChecks.rows
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error.message);
    res.status(500).json({ error: 'Server error generating dashboard summary' });
  }
};

module.exports = {
  getDashboardSummary
};
