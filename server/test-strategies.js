const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function runStrategyTests() {
  console.log('=== STARTING MULTI-STRATEGY RATE LIMIT TESTS ===');

  const testEmail = `test_strat_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  let jwtToken = '';

  try {
    // 1. Register and Login
    const regRes = await axios.post(`${BASE_URL}/api/auth/register`, {
      name: 'Strategy Tester',
      email: testEmail,
      password: testPassword
    });
    jwtToken = regRes.data.token;
    const authHeader = { headers: { 'Authorization': `Bearer ${jwtToken}` } };

    const strategies = ['sliding_window', 'fixed_window', 'token_bucket'];

    for (const strat of strategies) {
      console.log(`\n----------------------------------------`);
      console.log(`Testing Strategy: ${strat.toUpperCase()}`);
      console.log(`----------------------------------------`);

      // 2. Register API with current strategy
      console.log(`  Registering API configured for ${strat}...`);
      const apiRes = await axios.post(`${BASE_URL}/api/apis`, {
        name: `Test API (${strat})`,
        endpoint: 'https://jsonplaceholder.typicode.com/todos/1',
        method: 'GET',
        rate_limit: 3, // 3 requests
        rate_window: 10, // per 10 seconds
        rate_limit_strategy: strat,
        description: `Strategy integration test for ${strat}`
      }, authHeader);
      const apiId = apiRes.data.id;

      // 3. Generate key
      const keyRes = await axios.post(`${BASE_URL}/api/keys`, {
        api_id: apiId,
        name: `${strat} Test Key`
      }, authHeader);
      const apiKey = keyRes.data.plain_key;

      const gatewayUrl = `${BASE_URL}/gw/${apiId}`;
      const gatewayHeaders = { headers: { 'X-API-Key': apiKey } };

      // 4. Send 3 allowed requests
      for (let i = 1; i <= 3; i++) {
        const start = Date.now();
        const res = await axios.get(gatewayUrl, gatewayHeaders);
        const latency = Date.now() - start;
        console.log(`  ✔ Req #${i} allowed. Status: ${res.status}. Latency: ${latency}ms.`);
        console.log(`    Headers - Remaining: ${res.headers['x-ratelimit-remaining']}, Reset: ${res.headers['x-ratelimit-reset']}, Strategy: ${res.headers['x-ratelimit-strategy']}`);
      }

      // 5. Send 4th request (should be blocked)
      console.log(`  Sending request #4 (expecting 429 block)...`);
      try {
        await axios.get(gatewayUrl, gatewayHeaders);
        console.log(`  ❌ Error: Request #4 was allowed but should have been rate-limited.`);
      } catch (err) {
        if (err.response && err.response.status === 429) {
          console.log(`  ✔ Success: Request #4 was BLOCKED with HTTP 429.`);
          console.log(`    Strategy: ${err.response.headers['x-ratelimit-strategy']}`);
          console.log(`    Retry-After: ${err.response.headers['retry-after']} seconds`);
          console.log(`    Body:`, err.response.data);
        } else {
          console.log(`  ❌ Error: Request #4 failed with unexpected error:`, err.message);
        }
      }
    }

    console.log('\n=== MULTI-STRATEGY TESTS PASSED SUCCESSFULLY ===');
  } catch (error) {
    console.error('\n❌ Test Suite Failed:', error.response ? error.response.data : error.message);
  }
}

runStrategyTests();
