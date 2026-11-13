-- ==============================================================================
-- DigiWallet Schema for Supabase PostgreSQL
-- Run this script in the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Users table (authentication & profile)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Sessions table (hashed opaque tokens)
CREATE TABLE IF NOT EXISTS sessions (
  hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires);

-- 3. Wallets table (JSON aggregate per user with version counter)
CREATE TABLE IF NOT EXISTS wallets (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  state JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Shared institution catalog
CREATE TABLE IF NOT EXISTS institutions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  country TEXT NOT NULL,
  normalized TEXT NOT NULL,
  UNIQUE(kind, country, normalized)
);

-- Seed major Indian banks
INSERT INTO institutions (id, name, kind, country, normalized) VALUES
  ('sbi', 'State Bank of India', 'bank', 'IN', 'state bank of india'),
  ('hdfc', 'HDFC Bank', 'bank', 'IN', 'hdfc bank'),
  ('icici', 'ICICI Bank', 'bank', 'IN', 'icici bank'),
  ('axis', 'Axis Bank', 'bank', 'IN', 'axis bank'),
  ('pnb', 'Punjab National Bank', 'bank', 'IN', 'punjab national bank'),
  ('kotak', 'Kotak Mahindra Bank', 'bank', 'IN', 'kotak mahindra bank')
ON CONFLICT (kind, country, normalized) DO NOTHING;

-- 5. Append-only audit trail
CREATE TABLE IF NOT EXISTS audit (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL
);

-- 6. Rate-limiting attempts
CREATE TABLE IF NOT EXISTS attempts (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_attempts_expires ON attempts(expires);

