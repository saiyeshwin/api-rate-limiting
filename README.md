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

## 🧪 Automated Quality Engineering & API Test Suite

The platform includes a test suite located in `/tests` powered by **Postman**, **Newman CLI**, **Chai Assertions**, and **`newman-reporter-htmlextra`** for interactive HTML test reporting, alongside a dedicated **101-Request High-Volume Rate Limit Breach Benchmark**.

### 📋 Test Scenarios Overview

| Test ID | Area | Method & Route | Scenario / Purpose | Expected Status |
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
| **`TC_STRESS_101`**  | **Stress** | `GET /gw/:id` | **101-Requests Concurrency Benchmark** (100x 200, 1x 429)| `200 / 429` |

### 🚀 Running the QA Test Suite Locally

1. **Run Full Suite & Generate HTML Report**:
   ```bash
   npm run test:qa
   ```
2. **Run Only Newman Collection**:
   ```bash
   npm run test:newman --prefix tests
   ```
3. **Run Only High-Volume Rate Limit Breach (101 Requests)**:
   ```bash
   npm run test:breach --prefix tests
   ```

### 📊 Interactive HTML Test Report

After execution, the Newman HTML Extra report is generated at `tests/reports/index.html`. Open it in any browser:
```bash
# Windows
start tests/reports/index.html

# macOS
open tests/reports/index.html
```

### 🔄 CI/CD Pipeline (GitHub Actions)

A GitHub Actions workflow is configured at [`.github/workflows/test.yml`](.github/workflows/test.yml). On every `push` and `pull_request` to `main`:
1. Launches ephemeral **PostgreSQL 16** and **Redis 7** service containers.
2. Initializes schema tables and starts the Express gateway.
3. Executes the complete Newman automated test suite and high-concurrency 101-request breach test.
4. Uploads the generated `newman-html-test-report` HTML artifact to GitHub Actions.

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


