-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Farm Profiles Table
CREATE TABLE IF NOT EXISTS farm_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    state VARCHAR(100),
    district VARCHAR(100),
    default_land_size NUMERIC(10, 2) DEFAULT 1.00,
    default_measurement_unit VARCHAR(50) DEFAULT 'Acre',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_profile UNIQUE (user_id)
);

-- Chat Sessions Table
CREATE TABLE IF NOT EXISTS chat_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) DEFAULT 'New Chat',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    sender VARCHAR(10) CHECK (sender IN ('user', 'bot')) NOT NULL,
    text TEXT NOT NULL,
    
    -- Structured response fields from Kisan AI
    disease_name VARCHAR(255),
    confidence_score VARCHAR(10),
    immediate_action TEXT,
    chemical_cure TEXT,
    organic_cure TEXT,
    dosage_per_acre VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_time ON chat_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_time ON chat_messages(session_id, created_at ASC);
