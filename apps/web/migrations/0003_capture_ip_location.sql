-- Migration: 0003_capture_ip_location.sql
-- Description: Add ip_address, country, city, and location columns to users and orders tables

ALTER TABLE users ADD COLUMN ip_address TEXT;
ALTER TABLE users ADD COLUMN country TEXT;
ALTER TABLE users ADD COLUMN city TEXT;
ALTER TABLE users ADD COLUMN location TEXT;

ALTER TABLE orders ADD COLUMN ip_address TEXT;
ALTER TABLE orders ADD COLUMN country TEXT;
ALTER TABLE orders ADD COLUMN city TEXT;
ALTER TABLE orders ADD COLUMN location TEXT;

CREATE INDEX IF NOT EXISTS idx_users_ip_address ON users(ip_address);
CREATE INDEX IF NOT EXISTS idx_orders_ip_address ON orders(ip_address);
