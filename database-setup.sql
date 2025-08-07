-- Career Counselling Platform Database Setup
-- Run this script in your PostgreSQL database

-- Create english_assessments table with CHECK constraint instead of ENUM
CREATE TABLE IF NOT EXISTS english_assessments (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    submitted_text TEXT NOT NULL,
    word_count INTEGER NOT NULL,
    sentence_count INTEGER NOT NULL,
    average_word_length DECIMAL(5,2) NOT NULL,
    assessed_level VARCHAR(50) NOT NULL,
    request_id VARCHAR(255) UNIQUE NOT NULL,
    client_timestamp TIMESTAMP NOT NULL,
    request_processed VARCHAR(20) DEFAULT 'no' CHECK (request_processed IN ('yes', 'no', 'quota_exceeded', 'failed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_id ON english_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_created_at ON english_assessments(created_at);
CREATE INDEX IF NOT EXISTS idx_user_email ON english_assessments(user_email);
CREATE INDEX IF NOT EXISTS idx_request_id ON english_assessments(request_id);
CREATE INDEX IF NOT EXISTS idx_client_timestamp ON english_assessments(client_timestamp);
CREATE INDEX IF NOT EXISTS idx_request_processed ON english_assessments(request_processed);

-- Create career_surveys table
CREATE TABLE IF NOT EXISTS career_surveys (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    interests TEXT[] NOT NULL,
    personality_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table for additional user information
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    firebase_uid VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for career_surveys and users tables
CREATE INDEX IF NOT EXISTS idx_career_surveys_user_id ON career_surveys(user_id);
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create user quotas table
CREATE TABLE IF NOT EXISTS user_quotas (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    english_analysis_quota INTEGER DEFAULT 10,
    career_survey_quota INTEGER DEFAULT 5,
    premium_modules_quota INTEGER DEFAULT 0,
    total_purchases DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create enhanced English analysis requests table
CREATE TABLE IF NOT EXISTS english_analysis_requests (
    id SERIAL PRIMARY KEY,
    request_id UUID DEFAULT gen_random_uuid() UNIQUE,
    user_id VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    input_text TEXT NOT NULL,
    gcs_file_path VARCHAR(500),
    gcs_bucket VARCHAR(100) DEFAULT 'vidvaan-pdfs',
    file_size BIGINT,
    request_processed VARCHAR(20) DEFAULT 'no' CHECK (request_processed IN ('yes', 'no', 'quota_exceeded', 'failed')),
    assessed_level VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '30 days'),
    metadata JSONB
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_english_analysis_user_id ON english_analysis_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_english_analysis_request_id ON english_analysis_requests(request_id);
CREATE INDEX IF NOT EXISTS idx_user_quotas_user_id ON user_quotas(user_id);

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON TABLE english_assessments TO your_db_user;
-- GRANT ALL PRIVILEGES ON TABLE career_surveys TO your_db_user;
-- GRANT ALL PRIVILEGES ON TABLE users TO your_db_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_db_user; 