const axios = require('axios');
const db = require('../config/db');

let workerIntervalId = null;

// Perform health check on a single API endpoint
const checkApiHealth = async (api) => {
  const startTime = Date.now();
  
  try {
    const response = await axios({
      method: 'GET', // Default to GET for health checking endpoints
      url: api.endpoint,
      timeout: 5000, // 5 seconds timeout
      validateStatus: () => true // Catch all statuses
    });

    const responseTime = Date.now() - startTime;
    const isHealthy = response.status >= 200 && response.status < 400;
    
    await db.query(
      `INSERT INTO health_checks (api_id, status_code, response_time, is_healthy, error_message) 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        api.id, 
        response.status, 
        responseTime, 
        isHealthy, 
        isHealthy ? null : `Unhealthy status code: ${response.status}`
      ]
    );

    console.log(`Health check: API "${api.name}" is ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'} (${responseTime}ms)`);
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error.message || 'Network connection failed';
    
    await db.query(
      `INSERT INTO health_checks (api_id, status_code, response_time, is_healthy, error_message) 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        api.id, 
        null, 
        responseTime, 
        false, 
        errorMessage
      ]
    );

    console.log(`Health check: API "${api.name}" failed: ${errorMessage}`);
  }
};

// Run health checks on all registered APIs
const runAllHealthChecks = async () => {
  console.log('Background worker: Starting health check cycle...');
  try {
    const result = await db.query('SELECT id, name, endpoint, method FROM apis');
    const apis = result.rows;

    if (apis.length === 0) {
      console.log('Background worker: No APIs registered. Skipping check.');
      return;
    }

    // Run health checks concurrently
    const promises = apis.map(api => checkApiHealth(api));
    await Promise.allSettled(promises);
    
    console.log('Background worker: Health check cycle completed.');
  } catch (error) {
    console.error('Background worker error fetching APIs:', error.message);
  }
};

// Start the periodic background worker
const startWorker = (intervalMs = 60000) => {
  if (workerIntervalId) {
    console.warn('Worker is already running.');
    return;
  }

  console.log(`Background worker started. Running health checks every ${intervalMs / 1000}s`);
  
  // Run once immediately on start
  runAllHealthChecks();

  // Schedule interval
  workerIntervalId = setInterval(runAllHealthChecks, intervalMs);
};

// Stop the periodic background worker
const stopWorker = () => {
  if (workerIntervalId) {
    clearInterval(workerIntervalId);
    workerIntervalId = null;
    console.log('Background worker stopped.');
  }
};

module.exports = {
  startWorker,
  stopWorker,
  runAllHealthChecks
};
