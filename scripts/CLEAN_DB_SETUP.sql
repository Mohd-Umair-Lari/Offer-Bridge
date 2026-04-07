-- ===================================================================
-- OfferBridge — FRESH DATABASE SETUP (CLEAN & SIMPLE)
-- No RLS complexity - just working tables
-- 
-- HOW TO USE:
-- 1. Go to https://app.supabase.com
-- 2. Open your NEW project
-- 3. Go to SQL Editor → New Query
-- 4. Paste this entire script
-- 5. Click Run
-- ===================================================================

-- Drop all old tables
DROP TABLE IF EXISTS disputes CASCADE;
DROP TABLE IF EXISTS escrow CASCADE;
DROP TABLE IF EXISTS offers CASCADE;
DROP TABLE IF EXISTS requests CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Create profiles table
CREATE TABLE profiles (
  id            uuid primary key references auth.users on delete cascade,
  email         text,
  full_name     text,
  role          text default 'customer',
  avatar_url    text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Create requests table
CREATE TABLE requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id),
  title         text not null,
  amount        numeric default 0,
  category      text default 'Other',
  status        text default 'pending',
  description   text,
  deadline      date,
  product_link  text,
  required_card text default 'Any',
  is_public     boolean default true,
  offer_id      uuid,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Create offers table
CREATE TABLE offers (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id),
  card_name     text not null,
  card_type     text,
  bank          text,
  categories    text[] default '{}',
  discount      numeric default 0,
  cashback      numeric default 0,
  max_amount    numeric default 0,
  expiry        date,
  status        text default 'available',
  holder_name   text,
  deals_done    int default 0,
  rating        numeric default 5.0,
  verified      boolean default false,
  last4         text,
  is_public     boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Create escrow table
CREATE TABLE escrow (
  id            uuid primary key default gen_random_uuid(),
  deal_id       text unique,
  buyer_id      uuid references auth.users(id),
  cardholder_id uuid references auth.users(id),
  buyer         text,
  cardholder    text,
  item          text,
  amount        numeric,
  fee           numeric,
  status        text default 'held',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Create disputes table
CREATE TABLE disputes (
  id            uuid primary key default gen_random_uuid(),
  dispute_id    text unique,
  buyer_id      uuid references auth.users(id),
  cardholder_id uuid references auth.users(id),
  buyer         text,
  cardholder    text,
  item          text,
  amount        numeric,
  reason        text,
  status        text default 'open',
  priority      text default 'medium',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Disable RLS on all tables for simplicity (can add later)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE offers DISABLE ROW LEVEL SECURITY;
ALTER TABLE escrow DISABLE ROW LEVEL SECURITY;
ALTER TABLE disputes DISABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_requests_user_id ON requests(user_id);
CREATE INDEX idx_requests_is_public ON requests(is_public);
CREATE INDEX idx_offers_user_id ON offers(user_id);
CREATE INDEX idx_offers_is_public ON offers(is_public);
CREATE INDEX idx_escrow_buyer_id ON escrow(buyer_id);
CREATE INDEX idx_escrow_cardholder_id ON escrow(cardholder_id);
CREATE INDEX idx_disputes_buyer_id ON disputes(buyer_id);
CREATE INDEX idx_disputes_cardholder_id ON disputes(cardholder_id);

-- Verify tables created
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
