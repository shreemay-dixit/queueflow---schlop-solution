-- QueueFlow: Universal AI Queue Engine
-- Supabase / PostgreSQL Relational Database Schema & Realtime Replication

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(32) NOT NULL,
    name VARCHAR(128) NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tenant Configurations Table
CREATE TABLE IF NOT EXISTS tenant_configs (
    id VARCHAR(64) PRIMARY KEY, -- e.g. 'apex_clinic', 'metro_bank', 'civic_hub', 'apple_genius'
    name VARCHAR(128) NOT NULL,
    tagline TEXT NOT NULL,
    icon VARCHAR(16) NOT NULL,
    primary_color VARCHAR(32) NOT NULL,
    base_service_minutes INT NOT NULL DEFAULT 10,
    emergency_threshold INT NOT NULL DEFAULT 5,
    system_triage_instructions TEXT NOT NULL,
    queue_types JSONB NOT NULL DEFAULT '[]'::jsonb,
    time_of_day_multipliers JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Queue Entries Table
CREATE TABLE IF NOT EXISTS queue_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number VARCHAR(32) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(128) NOT NULL,
    user_phone VARCHAR(32) NOT NULL,
    business_id VARCHAR(64) REFERENCES tenant_configs(id) ON DELETE CASCADE,
    queue_type VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'waiting', -- 'waiting', 'in_progress', 'completed', 'cancelled'
    priority_score INT NOT NULL CHECK (priority_score BETWEEN 1 AND 5),
    estimated_wait_minutes INT NOT NULL,
    initial_estimated_wait_minutes INT NOT NULL,
    ai_reasoning TEXT NOT NULL,
    intake_text TEXT NOT NULL,
    language VARCHAR(64) DEFAULT 'English',
    intent VARCHAR(32) DEFAULT 'join_queue',
    confidence NUMERIC(4, 2) DEFAULT 0.95,
    ml_time_factor NUMERIC(4, 2) DEFAULT 1.0,
    bumped_up BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Dynamic Consent Upgrades (No-Show Slot Recapture)
CREATE TABLE IF NOT EXISTS consent_upgrades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    queue_entry_id UUID REFERENCES queue_entries(id) ON DELETE CASCADE,
    ticket_number VARCHAR(32) NOT NULL,
    user_name VARCHAR(128) NOT NULL,
    business_id VARCHAR(64) REFERENCES tenant_configs(id) ON DELETE CASCADE,
    previous_wait_minutes INT NOT NULL,
    new_estimated_wait_minutes INT NOT NULL,
    positions_gained INT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'offered', -- 'offered', 'accepted', 'declined', 'expired'
    offered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    reason_for_vacancy TEXT NOT NULL
);

-- 5. Explainable AI Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id VARCHAR(64) REFERENCES tenant_configs(id) ON DELETE CASCADE,
    event_type VARCHAR(64) NOT NULL,
    raw_input TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_queue_business_status ON queue_entries(business_id, status);
CREATE INDEX IF NOT EXISTS idx_queue_priority ON queue_entries(priority_score DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_consent_status ON consent_upgrades(business_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_business ON audit_logs(business_id, created_at DESC);

-- Enable Supabase Realtime Publication
ALTER PUBLICATION supabase_realtime ADD TABLE queue_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE consent_upgrades;
