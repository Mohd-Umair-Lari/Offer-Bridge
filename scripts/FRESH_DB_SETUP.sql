-- ===================================================================
-- OfferBridge — COMPLETE FRESH DATABASE SETUP
-- This script creates the database from scratch with proper RLS policies
-- 
-- HOW TO USE:
-- 1. Go to https://app.supabase.com
-- 2. Click your project
-- 3. Click "SQL Editor" → "New Query"
-- 4. Copy and paste the ENTIRE content of this file
-- 5. Click the "Run" button
-- 6. Wait for all queries to complete successfully
-- ===================================================================

-- ─────────────────────────────────────────────────────────────────
-- STEP 1: Drop existing tables (CAUTION: This deletes all data!)
-- ─────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS disputes CASCADE;
DROP TABLE IF EXISTS escrow CASCADE;
DROP TABLE IF EXISTS offers CASCADE;
DROP TABLE IF EXISTS requests CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ─────────────────────────────────────────────────────────────────
-- STEP 2: Create profiles table (for user metadata)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id            uuid references auth.users on delete cascade not null primary key,
  email         text unique,
  full_name     text,
  role          text default 'customer' check (role in ('customer', 'provider', 'customer_provider', 'admin')),
  avatar_url    text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Enable RLS but allow public read access
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profile read"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────────
-- STEP 3: Create requests table
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,
  title         text not null,
  amount        numeric not null default 0,
  category      text not null default 'Other',
  status        text not null default 'pending' check (status in ('pending', 'matched', 'completed', 'cancelled')),
  description   text,
  deadline      date,
  product_link  text,
  required_card text default 'Any',
  is_public     boolean default true,
  offer_id      uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz default now()
);

-- Enable RLS: Allow everyone to read public requests (no auth required)
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public requests visible to everyone"
  ON requests FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can insert own requests"
  ON requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own requests"
  ON requests FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own requests"
  ON requests FOR DELETE
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────
-- STEP 4: Create offers table
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE offers (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,
  card_name     text not null,
  card_type     text,
  bank          text,
  categories    text[] default '{}',
  discount      numeric default 0,
  cashback      numeric default 0,
  max_amount    numeric default 0,
  expiry        date,
  status        text default 'available' check (status in ('available', 'used', 'expired', 'inactive')),
  holder_name   text,
  deals_done    int default 0,
  rating        numeric default 5.0,
  verified      boolean default false,
  last4         text,
  is_public     boolean default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz default now()
);

-- Enable RLS: Allow everyone to read public offers (no auth required)
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public offers visible to everyone"
  ON offers FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can insert own offers"
  ON offers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own offers"
  ON offers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own offers"
  ON offers FOR DELETE
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────
-- STEP 5: Create escrow table
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE escrow (
  id            uuid primary key default gen_random_uuid(),
  deal_id       text unique,
  buyer_id      uuid references auth.users(id) on delete cascade,
  cardholder_id uuid references auth.users(id) on delete cascade,
  buyer         text,
  cardholder    text,
  item          text,
  amount        numeric,
  fee           numeric,
  status        text default 'held' check (status in ('held', 'released', 'returned', 'disputed')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz default now()
);

-- Enable RLS: Allow involved parties to view their escrows
ALTER TABLE escrow ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view escrows"
  ON escrow FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert escrows"
  ON escrow FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update escrows"
  ON escrow FOR UPDATE
  USING (true);

-- ─────────────────────────────────────────────────────────────────
-- STEP 6: Create disputes table
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE disputes (
  id            uuid primary key default gen_random_uuid(),
  dispute_id    text unique,
  buyer_id      uuid references auth.users(id) on delete cascade,
  cardholder_id uuid references auth.users(id) on delete cascade,
  buyer         text,
  cardholder    text,
  item          text,
  amount        numeric,
  reason        text,
  status        text default 'open' check (status in ('open', 'acknowledged', 'resolved', 'closed')),
  priority      text default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz default now()
);

-- Enable RLS: Allow viewing and managing disputes
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view disputes"
  ON disputes FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert disputes"
  ON disputes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update disputes"
  ON disputes FOR UPDATE
  USING (true);

-- ─────────────────────────────────────────────────────────────────
-- STEP 7: Create indexes for performance
-- ─────────────────────────────────────────────────────────────────
CREATE INDEX idx_requests_user_id ON requests(user_id);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_is_public ON requests(is_public);
CREATE INDEX idx_offers_user_id ON offers(user_id);
CREATE INDEX idx_offers_status ON offers(status);
CREATE INDEX idx_offers_is_public ON offers(is_public);
CREATE INDEX idx_escrow_buyer_id ON escrow(buyer_id);
CREATE INDEX idx_escrow_cardholder_id ON escrow(cardholder_id);
CREATE INDEX idx_escrow_status ON escrow(status);
CREATE INDEX idx_disputes_buyer_id ON disputes(buyer_id);
CREATE INDEX idx_disputes_cardholder_id ON disputes(cardholder_id);
CREATE INDEX idx_disputes_status ON disputes(status);

-- ─────────────────────────────────────────────────────────────────
-- STEP 8: Verify setup
-- ─────────────────────────────────────────────────────────────────
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'requests', 'offers', 'escrow', 'disputes')
ORDER BY tablename;
