-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create apis table
CREATE TABLE IF NOT EXISTS apis (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    endpoint TEXT NOT NULL,
    method VARCHAR(10) NOT NULL DEFAULT 'GET',
    rate_limit INTEGER NOT NULL DEFAULT 60,
    rate_window INTEGER NOT NULL DEFAULT 60, -- in seconds
    rate_limit_strategy VARCHAR(50) NOT NULL DEFAULT 'sliding_window',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    api_id UUID REFERENCES apis(id) ON DELETE CASCADE,
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    key_prefix VARCHAR(50) NOT NULL,
    name VARCHAR(100) DEFAULT 'Default Key',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP DEFAULT NULL
);

-- Create health_checks table
CREATE TABLE IF NOT EXISTS health_checks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    api_id UUID REFERENCES apis(id) ON DELETE CASCADE,
    status_code INTEGER,
    response_time INTEGER, -- in ms
    is_healthy BOOLEAN NOT NULL,
    error_message TEXT,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create requests_log table for gateway metrics
CREATE TABLE IF NOT EXISTS requests_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    api_id UUID REFERENCES apis(id) ON DELETE CASCADE,
    status_code INTEGER,
    response_time INTEGER, -- in ms
    is_violation BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_apis_user_id ON apis(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_health_checks_api_id ON health_checks(api_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_log_api_id ON requests_log(api_id, created_at DESC);
