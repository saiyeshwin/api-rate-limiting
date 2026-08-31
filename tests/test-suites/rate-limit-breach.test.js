const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

async function runRateLimitBreachTest() {
  console.log('\n============================================================');
  console.log('⚡ EXECUTING HIGH-CONCURRENCY RATE LIMIT BREACH TEST (101 REQS)');
  console.log('============================================================\n');

  try {
    // 1. Setup Test User
    const randomSuffix = Date.now();
    const userPayload = {
      name: 'Rate Limit Breach Tester',
      email: `breach_test_${randomSuffix}@example.com`,
      password: 'Password123!'
    };
    
    console.log(`1. Authenticating test agent: ${userPayload.email}...`);
    const regRes = await axios.post(`${BASE_URL}/api/auth/register`, userPayload);
    const token = regRes.data.token;
    const authHeaders = { headers: { 'Authorization': `Bearer ${token}` } };
    console.log('   ✔ User registered & JWT authenticated successfully.');

    // 2. Register API with 100 requests / 60 seconds limit
    console.log('\n2. Registering API with 100 requests / 60s limit...');
    const apiPayload = {
      name: 'High-Volume Rate Limit Breach Target',
      endpoint: 'https://jsonplaceholder.typicode.com/todos/1',
      method: 'GET',
      rate_limit: 100,
      rate_window: 60,
      rate_limit_strategy: 'sliding_window',
      description: 'Stress target for 101 requests boundary testing'
    };
    const apiRes = await axios.post(`${BASE_URL}/api/apis`, apiPayload, authHeaders);
    const apiId = apiRes.data.id;
    console.log(`   ✔ API endpoint registered (ID: ${apiId}).`);

    // 3. Generate API Key
    console.log('\n3. Generating API Access Key...');
    const keyRes = await axios.post(`${BASE_URL}/api/keys`, {
      api_id: apiId,
      name: '101-Breach-Key'
    }, authHeaders);
    const apiKey = keyRes.data.plain_key;
    console.log(`   ✔ API key issued: ${keyRes.data.key_prefix}`);

    // 4. Dispatch 101 requests rapidly
    console.log('\n4. Dispatching 101 requests rapidly through API Gateway (/gw/:id)...');
    const gatewayUrl = `${BASE_URL}/gw/${apiId}`;
    const gwHeaders = { headers: { 'X-API-Key': apiKey } };

    let successCount = 0;
    let rateLimitedCount = 0;
    let unexpectedFailures = 0;
    let breachResponseData = null;
    let breachHeaders = null;

    const startTime = Date.now();

    for (let i = 1; i <= 101; i++) {
      try {
        const res = await axios.get(gatewayUrl, gwHeaders);
        if (res.status === 200) {
          successCount++;
          if (i % 20 === 0 || i === 1 || i === 100) {
            console.log(`   -> Req #${i.toString().padStart(3, ' ')}: HTTP 200 OK | Remaining: ${res.headers['x-ratelimit-remaining']} | Reset: ${res.headers['x-ratelimit-reset']}s`);
          }
        }
      } catch (err) {
        if (err.response && err.response.status === 429) {
          rateLimitedCount++;
          breachResponseData = err.response.data;
          breachHeaders = err.response.headers;
          console.log(`   -> Req #${i.toString().padStart(3, ' ')}: 🛑 HTTP 429 TOO MANY REQUESTS (Rate Limit Breached as expected!)`);
        } else {
          unexpectedFailures++;
          console.error(`   -> Req #${i}: Unexpected error:`, err.message);
        }
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n⏱ 101 requests executed in ${elapsed} seconds.`);

    // 5. Assertions & Validation
    console.log('\n5. Evaluating Test Assertions:');
    let allPassed = true;

    // Assertion A: First 100 requests allowed
    if (successCount === 100) {
      console.log('   ✔ PASS: Exactly 100 requests were allowed within quota limit.');
    } else {
      console.error(`   ❌ FAIL: Expected 100 successful requests, but got ${successCount}.`);
      allPassed = false;
    }

    // Assertion B: 101st request rejected with HTTP 429
    if (rateLimitedCount === 1) {
      console.log('   ✔ PASS: Exactly 1 request (the 101st) was blocked with HTTP 429.');
    } else {
      console.error(`   ❌ FAIL: Expected 1 rate-limited request, but got ${rateLimitedCount}.`);
      allPassed = false;
    }

    // Assertion C: Retry-After header present and positive
    if (breachHeaders && breachHeaders['retry-after'] && parseInt(breachHeaders['retry-after']) > 0) {
      console.log(`   ✔ PASS: Retry-After header present with value: ${breachHeaders['retry-after']} seconds.`);
    } else {
      console.error('   ❌ FAIL: Missing or invalid Retry-After header on 429 response.');
      allPassed = false;
    }

    // Assertion D: Response body error verification
    if (breachResponseData && breachResponseData.error === 'Too Many Requests') {
      console.log('   ✔ PASS: Error message payload matched standard RFC format.');
    } else {
      console.error('   ❌ FAIL: Unexpected error payload on 429 response:', breachResponseData);
      allPassed = false;
    }

    // 6. Cleanup
    console.log('\n6. Cleaning up test API registration...');
    await axios.delete(`${BASE_URL}/api/apis/${apiId}`, authHeaders);
    console.log('   ✔ Test endpoint removed.');

    if (allPassed) {
      console.log('\n🎉 ALL 101-REQUEST RATE LIMIT BREACH ASSERTIONS PASSED!\n');
      return true;
    } else {
      console.error('\n❌ RATE LIMIT BREACH TEST FAILED ASSERTIONS!\n');
      return false;
    }
  } catch (err) {
    console.error('Critical test error:', err.response ? err.response.data : err.message);
    return false;
  }
}

if (require.main === module) {
  runRateLimitBreachTest().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { runRateLimitBreachTest };
