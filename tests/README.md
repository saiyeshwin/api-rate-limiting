# 🧪 Automated Quality Engineering & API Test Suite

This directory contains the automated Quality Engineering (QE) test suite for the **API Observability & Rate-Limiting Platform**. It features end-to-end functional validation, negative/edge testing, multi-strategy rate limiting verification, and high-concurrency burst benchmark testing.

---

## 🏗 Architecture & Stack

```
tests/
├── package.json                   # Test dependencies (Newman, htmlextra reporter, Axios)
├── postman_collection.json        # Postman Collection with modular suites & Chai assertions
├── postman_environment.json       # Postman Environment configuration
├── run-tests.js                   # Unified test orchestrator & reporting runner
├── test-suites/
│   └── rate-limit-breach.test.js  # Dedicated 101-requests rate limit breach benchmark
└── reports/
    └── index.html                 # Interactive HTML Extra test report output
```

- **Execution Engine**: [Newman CLI](https://learning.postman.com/docs/collections/using-newman-cli/command-line-integration-with-newman/) (programmatic and CLI modes)
- **Assertion Framework**: Chai Assertion Library (embedded in Postman collection test scripts)
- **Reporter**: [`newman-reporter-htmlextra`](https://github.com/DannyDainton/newman-reporter-htmlextra) for interactive dark/light HTML reports
- **CI/CD Integration**: GitHub Actions workflow (`.github/workflows/test.yml`)

---

## 📋 Test Scenarios & Traceability Matrix

| Test ID | Category | Method | Endpoint / Action | Test Scenario Description | Expected Status | Key Assertions & Checks |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **`TC_HLTH_001`** | **Health** | `GET` | `/health` | Verify platform service availability | `200 OK` | `status === 'ok'`, `service` identity verified |
| **`TC_AUTH_001`** | **Auth** | `POST` | `/api/auth/register` | Register new user with valid payload | `201 Created` | Returns valid JWT token & user ID; saves to environment |
| **`TC_AUTH_002`** | **Auth** | `POST` | `/api/auth/login` | Authenticate user with valid credentials | `200 OK` | Refreshes JWT token session |
| **`TC_AUTH_003`** | **Auth** | `GET` | `/api/auth/me` | Fetch authenticated user profile | `200 OK` | User ID & email match authenticated session |
| **`TC_AUTH_004`** | **Negative**| `POST` | `/api/auth/register` | Register user with missing credentials | `400 Bad Request`| Error: *"Please provide name, email and password"* |
| **`TC_AUTH_005`** | **Negative**| `POST` | `/api/auth/login` | Login with invalid password | `401 Unauthorized`| Error: *"Invalid email or password"* |
| **`TC_API_001`** | **API CRUD**| `POST` | `/api/apis` | Register endpoint with Sliding Window | `201 Created` | `rate_limit_strategy: 'sliding_window'`, stores `apiId` |
| **`TC_API_002`** | **API CRUD**| `POST` | `/api/apis` | Register endpoint with Fixed Window | `201 Created` | `rate_limit_strategy: 'fixed_window'` |
| **`TC_API_003`** | **API CRUD**| `POST` | `/api/apis` | Register endpoint with Token Bucket | `201 Created` | `rate_limit_strategy: 'token_bucket'` |
| **`TC_API_004`** | **API CRUD**| `PUT` | `/api/apis/:id` | Update rate limits and description | `200 OK` | Quota updated to 3 reqs / 10s |
| **`TC_API_005`** | **API CRUD**| `GET` | `/api/apis/:id` | Retrieve single API details & stats | `200 OK` | Contains `recentHealthChecks`, `recentRequests`, `stats` |
| **`TC_API_006`** | **API CRUD**| `GET` | `/api/apis` | List all registered user APIs | `200 OK` | Returns array of registered services with health flags |
| **`TC_API_007`** | **Negative**| `POST` | `/api/apis` | Register API with malformed URL protocol | `400 Bad Request`| Error: *"Please provide a valid endpoint URL"* |
| **`TC_API_008`** | **Negative**| `POST` | `/api/apis` | Register API with missing name | `400 Bad Request`| Error: *"Please provide API name and endpoint URL"* |
| **`TC_API_009`** | **Negative**| `GET` | `/api/apis/:id` | Access protected route without token | `401 Unauthorized`| Error: *"Not authorized, no token provided"* |
| **`TC_KEY_001`** | **Keys** | `POST` | `/api/keys` | Generate new API key | `201 Created` | Returns `plain_key` (`ap_...`) & `key_prefix`; stores key |
| **`TC_KEY_002`** | **Keys** | `GET` | `/api/keys/api/:apiId` | List keys for route (Security check) | `200 OK` | `plain_key` & `key_hash` strictly omitted from array |
| **`TC_KEY_003`** | **Negative**| `POST` | `/api/keys` | Generate key with missing `api_id` | `400 Bad Request`| Error: *"Please provide api_id and key name"* |
| **`TC_GW_001`** | **Gateway** | `GET` | `/gw/:apiId` | Gateway Proxy Call #1 (Remaining: 2) | `200 OK` | `X-RateLimit-Remaining: 2`, `X-RateLimit-Limit: 3` |
| **`TC_GW_002`** | **Gateway** | `GET` | `/gw/:apiId` | Gateway Proxy Call #2 (Remaining: 1) | `200 OK` | `X-RateLimit-Remaining: 1` |
| **`TC_GW_003`** | **Gateway** | `GET` | `/gw/:apiId` | Gateway Proxy Call #3 (Remaining: 0) | `200 OK` | `X-RateLimit-Remaining: 0` (boundary limit reached) |
| **`TC_GW_004`** | **Breach** | `GET` | `/gw/:apiId` | Gateway Proxy Call #4 (Quota Breached) | `429 Too Many Requests` | `Retry-After > 0`, `X-RateLimit-Remaining: 0`, body error |
| **`TC_GW_005`** | **Negative**| `GET` | `/gw/:apiId` | Gateway Call without `X-API-Key` header | `401 Unauthorized`| Error: *"Missing X-API-Key header"* |
| **`TC_GW_006`** | **Negative**| `GET` | `/gw/:apiId` | Gateway Call with Invalid `X-API-Key` | `401 Unauthorized`| Error: *"Invalid API key"* |
| **`TC_GW_007`** | **Keys** | `POST` | `/api/keys/:id/revoke`| Revoke active API Key | `200 OK` | Key marked as revoked with timestamp |
| **`TC_GW_008`** | **Negative**| `GET` | `/gw/:apiId` | Gateway Call with Revoked Key | `401 Unauthorized`| Error: *"API key has been revoked"* |
| **`TC_GW_009`** | **Negative**| `GET` | `/gw/00000000...` | Gateway Call to Non-Existent UUID | `404 Not Found` | Error: *"Gateway Routing Error: API endpoint not registered"* |
| **`TC_OBS_001`** | **Analytics**| `GET` | `/api/dashboard/summary` | Verify dashboard & P95 metrics aggregation | `200 OK` | `totalRequests >= 4`, `violations >= 1`, `p95LatencyMs` present |
| **`TC_OBS_002`** | **Cleanup** | `DELETE`| `/api/apis/:id` | Cascading delete of registered endpoint | `200 OK` | Endpoint and child keys removed |
| **`TC_STRESS_101`** | **Stress** | `GET` | `/gw/:apiId` | **101-Requests Rapid Concurrency Test** | `100x 200, 1x 429` | Reqs 1–100 allowed (200), Req 101 strictly rejected (429) with `Retry-After` |

---

## 🚀 How to Run the Test Suite

### 1. Run Everything (Newman Suite + HTML Report + 101-Breach Test)

From the project root:
```bash
npm run test:qa
```

Or directly inside the `tests/` folder:
```bash
cd tests
npm test
```

### 2. Run Only the Postman/Newman Suite

```bash
cd tests
npm run test:newman
```

### 3. Run Only the High-Concurrency Rate Limit Breach Test (101 Requests)

```bash
cd tests
npm run test:breach
```

---

## 📊 Sample Test Run Output

```text
================================================================
🚀 STARTING QUALITY ENGINEERING AUTOMATED TEST SUITE
================================================================

□ 1. Platform Health Check
└ TC_HLTH_001: Platform System Health Status [Functional]
  GET http://localhost:5000/health [200 OK, 335B, 8ms]
  √  Status code is 200 OK
  √  Platform reports healthy status

□ 2. Authentication & Security
└ TC_AUTH_001: Register New User [Functional]
  POST http://localhost:5000/api/auth/register [201 Created, 654B, 348ms]
  √  Status code is 201 Created
  √  Response contains valid JWT token and user credentials

...

----------------------------------------------------------------
📊 NEWMAN COLLECTION EXECUTION SUMMARY
----------------------------------------------------------------
Total Requests Executed: 29
Total Assertions Checked: 59
Passed Assertions:       59
Failed Assertions:       0
HTML Test Report Saved:  tests/reports/index.html
----------------------------------------------------------------

Running Step 2: High-Volume Rate Limit Breach (101 requests benchmark)...

============================================================
⚡ EXECUTING HIGH-CONCURRENCY RATE LIMIT BREACH TEST (101 REQS)
============================================================

1. Authenticating test agent: breach_test_1788197785542@example.com...
   ✔ User registered & JWT authenticated successfully.
2. Registering API with 100 requests / 60s limit...
   ✔ API endpoint registered (ID: 5e37c001-42b9-4994-9603-47ef49921ebb).
3. Generating API Access Key...
   ✔ API key issued: ap_14e19bd...
4. Dispatching 101 requests rapidly through API Gateway (/gw/:id)...
   -> Req #  1: HTTP 200 OK | Remaining: 99 | Reset: 60s
   -> Req # 20: HTTP 200 OK | Remaining: 80 | Reset: 60s
   -> Req # 40: HTTP 200 OK | Remaining: 60 | Reset: 60s
   -> Req # 60: HTTP 200 OK | Remaining: 40 | Reset: 60s
   -> Req # 80: HTTP 200 OK | Remaining: 20 | Reset: 60s
   -> Req #100: HTTP 200 OK | Remaining: 0 | Reset: 60s
   -> Req #101: 🛑 HTTP 429 TOO MANY REQUESTS (Rate Limit Breached as expected!)

⏱ 101 requests executed in 3.77 seconds.

5. Evaluating Test Assertions:
   ✔ PASS: Exactly 100 requests were allowed within quota limit.
   ✔ PASS: Exactly 1 request (the 101st) was blocked with HTTP 429.
   ✔ PASS: Retry-After header present with value: 57 seconds.
   ✔ PASS: Error message payload matched standard RFC format.

================================================================
🏁 FINAL TEST SUITE RESULTS
================================================================
🎉 STATUS: ALL TESTS PASSED (100% SUCCESS RATE)
📁 Detailed Interactive HTML Report: tests/reports/index.html
```

---

## 📈 Interactive HTML Extra Report

After running the tests, open the generated HTML report in any web browser:
```bash
# Windows
start tests/reports/index.html

# macOS
open tests/reports/index.html

# Linux
xdg-open tests/reports/index.html
```

The report includes:
- Total execution stats, pass/fail counts, and response latency breakdowns.
- Visual summary pie charts and per-folder test grouping.
- Full request headers, response payload bodies, and Chai assertion logs.
- Search filter by test name, status, or failure type.
