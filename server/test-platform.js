const axios = require('axios');
const crypto = require('crypto');

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('=== STARTING INTEGRATION TESTS ===');
  
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  let jwtToken = '';
  let apiId = '';
  let apiKey = '';

  try {
    // 1. Test User Registration
    console.log('\n1. Testing User Registration...');
    const regRes = await axios.post(`${BASE_URL}/api/auth/register`, {
      name: 'Test Engineer',
      email: testEmail,
      password: testPassword
    });
    console.log('✔ Registration successful. User ID:', regRes.data.id);
    jwtToken = regRes.data.token;

    // 2. Test User Login
    console.log('\n2. Testing User Login...');
    const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: testEmail,
      password: testPassword
    });
    console.log('✔ Login successful. Token obtained.');
    
    const authHeader = { headers: { 'Authorization': `Bearer ${jwtToken}` } };

    // 3. Test API Endpoint Registration
    console.log('\n3. Registering a Mock API...');
    const apiRes = await axios.post(`${BASE_URL}/api/apis`, {
      name: 'Integration Test API',
      endpoint: 'https://jsonplaceholder.typicode.com/todos/1',
      method: 'GET',
      rate_limit: 3, // very low limit for testing
      rate_window: 10, // 10 second window
      description: 'Used for automatic end-to-end integration tests'
    }, authHeader);
    
    apiId = apiRes.data.id;
    console.log('✔ API registered successfully. API ID:', apiId);

    // 4. Test Key Generation
    console.log('\n4. Generating API Access Key...');
    const keyRes = await axios.post(`${BASE_URL}/api/keys`, {
      api_id: apiId,
      name: 'Automated Test Key'
    }, authHeader);
    
    apiKey = keyRes.data.plain_key;
    console.log('✔ Key generated successfully.');
    console.log('  Key Prefix:', keyRes.data.key_prefix);
    console.log('  Plain-text Key:', apiKey);

    // 5. Verify Gateway Routing & Rate Limiting
    console.log('\n5. Sending requests through the Gateway (Quota: 3 reqs / 10s)...');
    
    const gatewayUrl = `${BASE_URL}/gw/${apiId}`;
    const gatewayHeaders = { headers: { 'X-API-Key': apiKey } };

    // Send 3 requests (should be allowed)
    for (let i = 1; i <= 3; i++) {
      console.log(`  Sending request #${i}...`);
      const start = Date.now();
      const res = await axios.get(gatewayUrl, gatewayHeaders);
      const latency = Date.now() - start;
      console.log(`  ✔ Request #${i} allowed. Status: ${res.status}. Latency: ${latency}ms.`);
      console.log(`    Headers - Remaining: ${res.headers['x-ratelimit-remaining']}, Reset: ${res.headers['x-ratelimit-reset']}`);
    }

    // Send 4th request (should be BLOCKED with 429)
    console.log('  Sending request #4 (expecting 429 Too Many Requests)...');
    try {
      await axios.get(gatewayUrl, gatewayHeaders);
      console.log('  ❌ Error: Request #4 was allowed but should have been rate-limited.');
    } catch (err) {
      if (err.response && err.response.status === 429) {
        console.log('  ✔ Success: Request #4 was BLOCKED with HTTP 429 Too Many Requests.');
        console.log(`    Retry-After: ${err.response.headers['retry-after']} seconds.`);
        console.log('    Response body:', err.response.data);
      } else {
        console.log('  ❌ Error: Request #4 failed with unexpected error:', err.message);
      }
    }

    // Wait for the window to reset
    console.log('\n6. Waiting 10 seconds for sliding-window cooldown...');
    await new Promise(resolve => setTimeout(resolve, 10500));

    // Send a request after cooling down (should succeed)
    console.log('  Sending request #5 (should succeed after cooldown)...');
    const cooldownRes = await axios.get(gatewayUrl, gatewayHeaders);
    console.log(`  ✔ Success: Request #5 allowed. Status: ${cooldownRes.status}.`);

    // 7. Verify Dashboard Aggregations
    console.log('\n7. Fetching Dashboard Stats...');
    const dashRes = await axios.get(`${BASE_URL}/api/dashboard/summary`, authHeader);
    const summary = dashRes.data.summary;
    console.log('✔ Dashboard statistics fetched:');
    console.log('  Total APIs:', summary.totalApis);
    console.log('  Total Gateway Calls:', summary.totalRequests);
    console.log('  Rate Limit Violations (429):', summary.violations);
    console.log('  Average Gateway Latency:', summary.avgLatencyMs, 'ms');
    
    console.log('\n=== INTEGRATION TESTS PASSED SUCCESSFULLY ===');
  } catch (error) {
    console.error('\n❌ Test Suite Failed with error:', error.response ? error.response.data : error.message);
  }
}

// Start execution
runTests();
