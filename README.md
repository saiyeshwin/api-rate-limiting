# API Observability & Rate-Limiting Platform

A developer platform that allows registration of target APIs, enforces configurable sliding-window rate limits, and monitors endpoint availability and response latencies through a clean React dashboard.

## 🛠 Tech Stack

- **Backend**: Node.js, Express, PostgreSQL, Redis (with automatic in-memory sliding-window fallback)
- **Frontend**: React (Vite), Tailwind CSS, Lucide-React
- **Database**: PostgreSQL (port `5433`, db `api_observability`)
- **Limiter Engine**: Redis Lua script / Mock memory engine

---

## 🌟 Key Features

1. **User Authentication (JWT)**: Register and log in securely. All APIs, keys, and metrics are fully isolated per user.
2. **API Registration (CRUD)**: Easily add upstream targets, configure custom rate quotas, and define custom methods.
3. **API Key Lifecycle**: Generate secure keys, view prefixes, and revoke access instantly. Hashed storage prevents credential leaks.
4. **Sliding-Window Rate Limiting**: Uses Redis Lua scripts to calculate windows atomically. Automatically replies with standard headers (`Retry-After`, `X-RateLimit-*`) and `HTTP 429`.
5. **Background Health Worker**: Pings monitored endpoints in the background, measuring latencies and logging availability states.
6. **Observability Dashboard**: Surfaces overall health counts, average latencies, real-time traffic statistics, and live request logs. Uses custom SVG graphs for high-resolution traffic plotting.

---

## 📁 Repository Structure

```
/api
  ├── server/                 # Node.js backend
  │     ├── src/
  │     │    ├── config/      # DB and Redis setups
  │     │    ├── controllers/ # REST endpoint handlers
  │     │    ├── db/          # PostgreSQL schema script
  │     │    ├── middleware/  # JWT and gateway auth
  │     │    └── services/    # Proxy gateway and background worker
  │     ├── .env              # Backend configuration
  │     └── test-platform.js  # E2E integration test script
  │
  ├── client/                 # React frontend
  │     ├── src/
  │     │    ├── components/  # Dashboard, details, forms, nav, login
  │     │    ├── App.jsx      # React router configuration
  │     │    └── main.jsx
  │     └── vite.config.js    # Vite dev proxy definitions
```

---

## ⚙ Setup & Quickstart

### 1. Database Setup
Ensure PostgreSQL is running. Run the schema creation file against your database:
```bash
# Example using psql (default password is 'root' on port 5433)
psql -h localhost -p 5433 -U postgres -d api_observability -f server/src/db/schema.sql
```

### 2. Run Backend Server
```bash
cd server
npm install
npm start
```
The server will start on `http://localhost:5000` and start the health worker.

### 3. Run Frontend Dashboard
```bash
cd client
npm install
npm run dev
```
Open `http://localhost:3000` in your web browser.

### 4. Running Integration Tests
To trigger the automated integration test suite validating auth, key hashing, proxying, and 429 limit blocks:
```bash
cd server
node test-platform.js
```

To test all three rate-limiting strategies (Sliding Window, Fixed Window, and Token Bucket) concurrently:
```bash
cd server
node test-strategies.js
```

---

## 🧪 Automated Quality Engineering, Database & UI Test Suite

The platform includes a multi-tiered Quality Engineering automation framework located in `/tests`:
- **API & Rate Limiting Suite**: Built with **Postman**, **Newman CLI**, and **Chai Assertions** with HTML reporting.
- **SQL Database Validation Suite**: Direct **PostgreSQL** table integrity and hash validation using Node `pg`.
- **High-Volume Concurrency Benchmark**: Dedicated **101-Requests rapid breach test** asserting exact boundary throttling.
- **End-to-End UI Automation Suite**: Built with **Selenium WebDriver 4**, **Java 17**, **TestNG**, and the **Page Object Model (POM)** pattern in [`/tests/ui`](tests/ui).

### 📋 Test Scenarios & Traceability Matrix

| Test ID | Area / Layer | Method & Route | Scenario / Purpose | Expected Status |
| :--- | :--- | :--- | :--- | :---: |
| **`TC_HLTH_001`** | **Health** | `GET /health` | Platform availability check | `200 OK` |
| **`TC_AUTH_001-003`**| **Auth** | `POST /api/auth/*` | Registration, login, profile & JWT validation | `200 / 201` |
| **`TC_AUTH_004-005`**| **Negative** | `POST /api/auth/*` | Missing fields & invalid credentials rejection | `400 / 401` |
| **`TC_API_001-006`** | **API CRUD** | `/api/apis/*` | Endpoint creation across Sliding/Fixed/Token Bucket | `200 / 201` |
| **`TC_API_007-009`** | **Negative** | `/api/apis/*` | Malformed URL protocol, missing name, missing token | `400 / 401` |
| **`TC_KEY_001-003`** | **Keys** | `/api/keys/*` | Key generation, prefix masking, missing ID validation | `200 / 201 / 400` |
| **`TC_GW_001-003`**  | **Gateway** | `GET /gw/:id` | Allowed proxy hits (Remaining: 2 -> 1 -> 0) | `200 OK` |
| **`TC_GW_004`**      | **Breach** | `GET /gw/:id` | 4th request rate limit breach rejection | `429 Too Many Requests` |
| **`TC_GW_005-009`**  | **Negative** | `GET /gw/:id` | Missing key, invalid key, revoked key, unknown UUID | `401 / 404` |
| **`TC_OBS_001-002`** | **Analytics**| `GET /api/dashboard/summary`| Dashboard latency & P95 metrics aggregation | `200 OK` |
| **`TC_DB_001`**      | **SQL DB** | Direct Query | **SHA-256 Hash & Prefix Match in PostgreSQL** | `Hash Verified` |
| **`TC_DB_002`**      | **SQL DB** | Direct Query | **Revocation Timestamp Set in PostgreSQL** | `Timestamp Set` |
| **`TC_DB_003`**      | **SQL DB** | Direct Query | **Cascade Foreign Key Deletion Integrity** | `0 Rows Left` |
| **`TC_STRESS_101`**  | **Stress** | `GET /gw/:id` | **101-Requests Concurrency Benchmark** (100x 200, 1x 429)| `200 / 429` |
| **`TC_UI_001`**      | **Selenium** | `/signup` | User registration flow via React form | `Redirect to /` |
| **`TC_UI_002-003`**  | **Selenium** | `/login` | Valid login and negative invalid password alert | `Redirect / Error` |
| **`TC_UI_004`**      | **Selenium** | `/` | Dashboard summary cards and navbar rendering | `Cards Visible` |
| **`TC_UI_005`**      | **Selenium** | `/apis/register`| Register API endpoint via UI and verify in table list | `API Listed` |

### 🚀 Running the Automated Test Suites Locally

1. **Run Full API + Database + Concurrency Suite**:
   ```bash
   npm run test:qa
   ```
2. **Run Only SQL Database Validation**:
   ```bash
   npm run test:db --prefix tests
   ```
3. **Run High-Concurrency 101-Requests Rate Limit Breach**:
   ```bash
   npm run test:breach --prefix tests
   ```
4. **Run Selenium WebDriver UI Tests (Java + TestNG)**:
   ```bash
   cd tests/ui
   mvn clean test
   ```

### 📊 Test Reports & Dashboards

- **Newman HTML Extra Report**: Generated at `tests/reports/index.html` (open via `start tests/reports/index.html`).
- **TestNG HTML UI Report**: Generated at `tests/ui/target/surefire-reports/index.html`.

### 🔄 CI/CD Pipeline (GitHub Actions)

A GitHub Actions workflow is active at [`.github/workflows/test.yml`](.github/workflows/test.yml) with two parallel jobs:
1. **`api-and-db-tests`**: Launches PostgreSQL 16 & Redis 7 service containers, starts the backend, executes Newman API test collection, runs direct PostgreSQL SQL integrity validation (`TC_DB_001-003`), runs the 101-request breach benchmark, and uploads `newman-html-test-report`.
2. **`ui-selenium-tests`**: Starts backend and frontend services, launches headless Google Chrome via Selenium WebDriver 4, executes TestNG UI test suite (`TC_UI_001-005`), and uploads `testng-html-report`.


---

## 🐳 Running with Docker

You can run the entire platform, including the Express API Gateway, React dashboard, PostgreSQL database, and Redis cache, inside isolated Docker containers:

1. **Start the containers** (automatically initializes database tables):
   ```bash
   docker-compose up --build
   ```
2. **Access the application**:
   - React Dashboard: `http://localhost` (Port 80)
   - Express Backend API: `http://localhost:5000`
   - Redis Database: `localhost:6380`
   - PostgreSQL Database: `localhost:5434`
3. **Stop the containers**:
   ```bash
   docker-compose down
   ```


