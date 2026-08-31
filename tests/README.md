# 🧪 Comprehensive Quality Engineering & Automation Test Suite

This directory houses the end-to-end Quality Engineering (QE) and automated test suites for the **API Observability & Rate-Limiting Platform**. It spans **API Testing (Newman/Postman)**, **SQL Database Validation (pg)**, **Concurrency Rate Limit Breach Testing (101 Requests)**, and **Full-Stack Browser UI Automation (Selenium WebDriver + Java + TestNG)**.

---

## 🏗 Multi-Tier Test Architecture

```
tests/
├── package.json                   # API & DB test dependencies (Newman, Axios, pg, htmlextra)
├── postman_collection.json        # Postman Collection with modular suites & Chai assertions
├── postman_environment.json       # Dynamic environment variables
├── run-tests.js                   # Unified API, SQL & Concurrency test orchestrator
├── test-suites/
│   ├── db-validation.test.js      # Direct PostgreSQL SQL-level data integrity tests
│   └── rate-limit-breach.test.js  # Dedicated 101-requests rate limit breach benchmark
├── reports/
│   └── index.html                 # Interactive Newman HTML Extra test report
└── ui/                            # 🌐 Selenium WebDriver (Java + TestNG) UI Suite
    ├── pom.xml                    # Maven configuration (Selenium 4, TestNG, Surefire)
    ├── testng.xml                 # TestNG suite XML
    ├── README.md                  # UI testing guide
    └── src/
        ├── main/java/com/apiobservability/pages/  # Page Object Model (POM) classes
        └── test/java/com/apiobservability/tests/  # TestNG test cases
```

---

## 📋 Comprehensive Test Scenarios Matrix

| Test ID | Tier | Method / Type | Endpoint / Action | Scenario Description | Expected Status | Key Assertions & Checks |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **`TC_HLTH_001`** | **Health** | `GET` | `/health` | Platform availability health check | `200 OK` | `status === 'ok'`, `service` identity verified |
| **`TC_AUTH_001`** | **Auth** | `POST` | `/api/auth/register` | Register new user with valid payload | `201 Created` | Valid JWT & user ID returned; saved to environment |
| **`TC_AUTH_002`** | **Auth** | `POST` | `/api/auth/login` | Authenticate user with valid credentials | `200 OK` | Refreshes JWT token session |
| **`TC_AUTH_003`** | **Auth** | `GET` | `/api/auth/me` | Fetch authenticated user profile | `200 OK` | User ID & email match active session |
| **`TC_AUTH_004`** | **Negative**| `POST` | `/api/auth/register` | Register user with missing credentials | `400 Bad Request`| Error: *"Please provide name, email and password"* |
| **`TC_AUTH_005`** | **Negative**| `POST` | `/api/auth/login` | Login with invalid password | `401 Unauthorized`| Error: *"Invalid email or password"* |
| **`TC_API_001`** | **API CRUD**| `POST` | `/api/apis` | Register endpoint with Sliding Window | `201 Created` | `rate_limit_strategy: 'sliding_window'`, stores `apiId` |
| **`TC_API_002`** | **API CRUD**| `POST` | `/api/apis` | Register endpoint with Fixed Window | `201 Created` | `rate_limit_strategy: 'fixed_window'` |
| **`TC_API_003`** | **API CRUD**| `POST` | `/api/apis` | Register endpoint with Token Bucket | `201 Created` | `rate_limit_strategy: 'token_bucket'` |
| **`TC_API_004`** | **API CRUD**| `PUT` | `/api/apis/:id` | Update rate limits and description | `200 OK` | Quota updated to 3 reqs / 10s |
| **`TC_API_005`** | **API CRUD**| `GET` | `/api/apis/:id` | Retrieve single API details & stats | `200 OK` | Contains `recentHealthChecks`, `stats`, and P95 latency |
| **`TC_API_006`** | **API CRUD**| `GET` | `/api/apis` | List all registered user APIs | `200 OK` | Returns array of registered services with health status |
| **`TC_API_007`** | **Negative**| `POST` | `/api/apis` | Register API with malformed URL protocol | `400 Bad Request`| Error: *"Please provide a valid endpoint URL"* |
| **`TC_API_008`** | **Negative**| `POST` | `/api/apis` | Register API with missing name | `400 Bad Request`| Error: *"Please provide API name and endpoint URL"* |
| **`TC_API_009`** | **Negative**| `GET` | `/api/apis/:id` | Access protected route without token | `401 Unauthorized`| Error: *"Not authorized, no token provided"* |
| **`TC_KEY_001`** | **Keys** | `POST` | `/api/keys` | Generate new API key | `201 Created` | Returns `plain_key` (`ap_...`) & `key_prefix`; stores key |
| **`TC_KEY_002`** | **Keys** | `GET` | `/api/keys/api/:apiId` | List keys for route (Security check) | `200 OK` | `plain_key` & `key_hash` strictly omitted from payload |
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
| **`TC_OBS_001`** | **Analytics**| `GET` | `/api/dashboard/summary` | Verify dashboard & P95 latency metrics | `200 OK` | `totalRequests >= 4`, `violations >= 1`, `p95LatencyMs` present |
| **`TC_OBS_002`** | **Cleanup** | `DELETE`| `/api/apis/:id` | Cascading delete of registered endpoint | `200 OK` | Endpoint and child keys removed |
| **`TC_DB_001`** | **SQL DB** | SQL Query | `api_keys` Table | **Direct DB Hash & Prefix Check** | `Row Validated` | Verifies SHA-256 hash matches computed digest, prefix matches, plain secret not persisted |
| **`TC_DB_002`** | **SQL DB** | SQL Query | `api_keys` Table | **Direct Revocation DB Check** | `Timestamp Set` | Verifies `revoked_at IS NOT NULL` directly in PostgreSQL |
| **`TC_DB_003`** | **SQL DB** | SQL Query | `apis` & `api_keys` Tables | **Foreign Key Cascade Integrity** | `0 Rows Left` | Verifies API and child keys are deleted via `ON DELETE CASCADE` |
| **`TC_STRESS_101`** | **Stress** | `GET` | `/gw/:apiId` | **101-Requests Rapid Concurrency Test** | `100x 200, 1x 429` | Reqs 1–100 allowed (200), Req 101 strictly rejected (429) with `Retry-After` |
| **`TC_UI_001`** | **Selenium**| Browser | `/signup` -> `/` | **User Registration UI Flow** | `Redirect to /` | Submits React signup form, verifies session, loads dashboard |
| **`TC_UI_002`** | **Selenium**| Browser | `/login` -> `/` | **User Login with Valid Credentials** | `Redirect to /` | Authenticates existing user and verifies dashboard header |
| **`TC_UI_003`** | **Selenium**| Browser | `/login` | **Negative Login Flow** | `Error Displayed`| Submits invalid credentials, verifies error alert displayed |
| **`TC_UI_004`** | **Selenium**| Browser | `/` | **Dashboard Summary Metrics Validation** | `Cards Rendered`| Verifies Total APIs, Healthy APIs, Calls, and Violations cards |
| **`TC_UI_005`** | **Selenium**| Browser | `/apis/register` -> `/` | **Register API via Form & Verify in List**| `API Listed` | Submits form and verifies new API appears in dashboard table |

---

## 🚀 How to Run the Tests

### 1. Run Complete API, Database & Rate-Limiting Test Pipeline

From repository root:
```bash
npm run test:qa
```

Or inside `tests/`:
```bash
cd tests
npm test
```

### 2. Run Only Direct SQL Database Validation Tests

```bash
cd tests
npm run test:db
```

### 3. Run Only High-Concurrency Rate Limit Breach Test (101 Requests)

```bash
cd tests
npm run test:breach
```

### 4. Run Selenium WebDriver UI Automation Tests (Java + TestNG)

```bash
cd tests/ui
mvn clean test
```

---

## 📊 Test Reports & Dashboards

1. **Newman HTML Extra Interactive Report**:
   - Location: `tests/reports/index.html`
   - Open in browser: `start tests/reports/index.html` (Windows) or `open tests/reports/index.html` (macOS).

2. **Surefire / TestNG UI HTML Report**:
   - Location: `tests/ui/target/surefire-reports/index.html`
   - Emailable Report: `tests/ui/target/surefire-reports/emailable-report.html`

---

## 🔄 Dual CI/CD Pipeline (GitHub Actions)

A GitHub Actions workflow is defined in [`.github/workflows/test.yml`](../.github/workflows/test.yml) consisting of two independent, parallel jobs:
1. **`api-and-db-tests`**: Runs PostgreSQL 16 & Redis 7 service containers, executes Newman API collection, runs direct PostgreSQL SQL integrity validation (`TC_DB_001-003`), runs the 101-request breach test, and uploads `newman-html-test-report`.
2. **`ui-selenium-tests`**: Starts backend and frontend services, launches headless Google Chrome via Selenium WebDriver 4, executes TestNG UI test suite (`TC_UI_001-005`), and uploads `testng-html-report`.
