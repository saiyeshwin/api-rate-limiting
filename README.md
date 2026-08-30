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

