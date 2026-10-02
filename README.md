# API Observability & Event-Driven Microservices Platform

A production-grade distributed developer platform that manages API endpoints, enforces configurable sliding-window rate limits, streams observability telemetry through **Apache Kafka**, and calculates real-time analytics using a dedicated **Java / Spring Boot Microservice** with **Idempotency**, **Exponential Retries**, and **Dead Letter Queue (DLQ)** management.

---

## 🏛️ Microservices Architecture & System Design

```mermaid
flowchart TD
    Client["React Frontend (Client)\nPort 3000 / 80"] -->|HTTP / REST| Gateway["API Gateway Service\nNode.js / Express\nPort 5000"]
    
    subgraph Gateway_Internal ["API Gateway Responsibilities"]
        Auth["JWT Auth & Route Guard"]
        RateLimiter["Sliding Window Rate Limiter"]
        IdempotencyMW["Idempotency Filter (Redis/DB)"]
        KafkaProducer["Kafka Event Publisher (kafkajs)"]
    end
    
    Gateway --> Auth --> RateLimiter --> IdempotencyMW --> KafkaProducer
    RateLimiter <--> Redis[("Redis Container\nPort 6379")]
    Gateway <--> Postgres[("PostgreSQL\nPort 5432")]
    
    subgraph Kafka_Broker ["Apache Kafka (KRaft Single-Node)"]
        RawTopic["Topic: api.requests.raw"]
        ViolationTopic["Topic: api.rate-limit.violations"]
        HealthTopic["Topic: api.health.checks"]
        RetryTopic["Topic: api.requests.raw.retry"]
        DLQTopic["Topic: api.requests.dlq"]
    end
    
    KafkaProducer -->|Publish async| RawTopic
    KafkaProducer -->|Publish async| ViolationTopic
    KafkaProducer -->|Publish async| HealthTopic
    
    subgraph Analytics_Microservice ["Analytics & Observability Service (Java Spring Boot 3 - Port 8081)"]
        Consumer["Kafka Listener & Dispatcher"]
        IdempotencyService["Idempotency Deduplicator (processed_events)"]
        RetryManager["@RetryableTopic / Exponential Backoff"]
        DLQHandler["DLQ Message Handler & Storage"]
        MetricsAggregator["P50/P90/P95/P99 Percentile Calculator"]
        DLQController["DLQ Replay & Inspection REST APIs"]
    end
    
    RawTopic --> Consumer
    ViolationTopic --> Consumer
    HealthTopic --> Consumer
    
    Consumer --> IdempotencyService --> MetricsAggregator --> Postgres
    Consumer -->|On Transient Failure| RetryTopic -->|Retries Exhausted| DLQTopic
    DLQTopic --> DLQHandler --> Postgres
    
    KafkaUI["Kafka UI (Web Dashboard)\nPort 8080"] -.-> Kafka_Broker
```

---

## 🛠 Tech Stack

- **API Gateway Service**: Node.js, Express, KafkaJS, Redis, PostgreSQL, Axios, JWT
- **Analytics Microservice**: Java 17, Spring Boot 3.2, Spring Kafka, Spring Data JPA, Hibernate, PostgreSQL, Lombok
- **Event Streaming & Resilience**: Apache Kafka (KRaft mode), Kafka UI, Non-blocking Retries (`@RetryableTopic`), Dead Letter Queue (`.dlq`)
- **Frontend**: React (Vite), Tailwind CSS, Material Design 3, Lucide-React
- **Databases & Cache**: PostgreSQL 16, Redis 7 (with atomic Lua sliding-window script)
- **Containerization**: Docker, Docker Compose (multi-container orchestration)
- **Automated Testing Frameworks**: 
  - **Unit Testing**: JUnit 5, Mockito, AssertJ
  - **Integration Testing**: Spring Boot Test with `@EmbeddedKafka`, Postman/Newman with PostgreSQL SQL integrity assertions
  - **E2E UI Testing**: Selenium WebDriver 4, TestNG, Page Object Model (POM)

---

## 🌟 Key Capabilities

1. **Microservices Decomposition**: Decoupled high-speed edge proxying (Gateway) from heavy data analysis (Analytics Service) via asynchronous Kafka message passing.
2. **Kafka Event-Driven Streaming**:
   - `api.requests.raw`: Non-blocking real-time stream of all gateway invocations.
   - `api.rate-limit.violations`: Published when a client breaches quota limits (HTTP 429).
   - `api.health.checks`: Emitted during background availability probes.
3. **Idempotency & Deduplication**:
   - **HTTP-level Idempotency**: Intercepts mutating requests using `Idempotency-Key` headers with Redis & PostgreSQL response caching.
   - **Consumer-level Event Deduplication**: Guarantees exactly-once processing across Kafka consumer instances using the `processed_events` atomic state store.
4. **Resilience, Retries & Dead Letter Queue (DLQ)**:
   - Configures non-blocking retries with exponential backoff (`delay = 1000ms`, `multiplier = 2.0`, `maxAttempts = 3`).
   - Poison or unprocessable messages automatically divert to Dead Letter Topics (`api.requests.dlq`) with full diagnostic headers (`x-original-topic`, `x-exception-message`, `x-exception-stacktrace`).
   - Admin REST API provides on-demand inspection and message replay (`POST /api/analytics/dlq/reprocess/{id}`).
5. **Real-Time Percentile Analytics**:
   - Calculates P50, P90, P95, and P99 response latencies, violation frequencies, and uptime percentages.
6. **Multi-Container Docker Orchestration**: One-click local and production startup using `docker-compose.yml`.

---

## 🚀 Quickstart with Docker Compose

To start the entire distributed microservices platform, Kafka broker, databases, and dashboards:

```bash
docker compose up -d --build
```

### Services & Port Mappings:

| Service | Port | Description |
| :--- | :--- | :--- |
| **Client Frontend** | `http://localhost:80` (or `3000`) | React Material Design 3 Web Dashboard |
| **API Gateway** | `http://localhost:5000` | REST API Gateway, Proxy & Kafka Producer |
| **Analytics Service** | `http://localhost:8081` | Spring Boot Kafka Consumer & Observability Service |
| **Kafka UI** | `http://localhost:8080` | Web UI for inspecting Kafka topics, consumer groups & DLQs |
| **Apache Kafka** | `localhost:9092` | Event Streaming Broker (KRaft mode) |
| **PostgreSQL** | `localhost:5434` | Relational Storage (mapped from container 5432) |
| **Redis** | `localhost:6380` | Distributed Rate Limiter Cache (mapped from container 6379) |

---

## 🧪 Testing Suite

### 1. Spring Boot Unit & Integration Tests (JUnit 5 + Mockito + EmbeddedKafka)
```bash
cd services/analytics-service
mvn clean test
```
- `IdempotencyServiceTest`: Verifies atomic locking, duplicate suppression, and concurrency protection.
- `RequestEventConsumerTest`: Tests message consumption, transformation, and poison pill exception handling.
- `DlqManagementServiceTest`: Tests DLQ message recording, discarding, and Kafka reprocessing.
- `MetricsAggregationServiceTest`: Tests P50/P90/P95/P99 latency calculations.
- `KafkaConsumerIntegrationTest`: End-to-end integration test with `@EmbeddedKafka` testing event consumption and deduplication.

### 2. API Gateway & Rate Limiting Tests (Postman + Newman + SQL Assertions)
```bash
cd tests
npm test
```

### 3. Selenium WebDriver UI E2E Automation Tests (Java + TestNG)
```bash
cd tests/ui
mvn clean test -DbaseUrl=http://localhost:5000
```
