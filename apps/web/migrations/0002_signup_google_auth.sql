-- Migration: 0002_signup_google_auth.sql
-- Description: Add phone, google_id, and avatar_url to users table with appropriate indexes

ALTER TABLE users ADD COLUMN phone TEXT;
ALTER TABLE users ADD COLUMN google_id TEXT;
ALTER TABLE users ADD COLUMN avatar_url TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
