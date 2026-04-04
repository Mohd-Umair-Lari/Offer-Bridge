-- ===================================================================
-- OfferBridge — Complete Database Reset & Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ===================================================================

-- Drop existing tables (in case they exist with wrong schema)
drop table if exists disputes cascade;
drop table if exists escrow cascade;
drop table if exists offers cascade;
drop table if exists requests cascade;

-- ─── requests ──────────────────────────────────────────────────────
create table requests (
  id            uuid primary key default gen_random_uuid(),
  title         text        not null,
  amount        numeric     not null default 0,
  category      text        not null default 'Other',
  status        text        not null default 'pending',
  description   text,
  deadline      date,
  product_link  text,
  required_card text        default 'Any',
  is_public     boolean     default true,
  offer_id      uuid,
  created_at    timestamptz not null default now()
);

alter table requests enable row level security;
create policy "public_access" on requests for all using (true) with check (true);

-- ─── offers ────────────────────────────────────────────────────────
create table offers (
  id          uuid    primary key default gen_random_uuid(),
  card_name   text    not null,
  card_type   text,
  bank        text,
  categories  text[]  default '{}',
  discount    numeric default 0,
  cashback    numeric default 0,
  max_amount  numeric default 0,
  expiry      date,
  status      text    default 'available',
  holder_name text,
  deals_done  int     default 0,
  rating      numeric default 5.0,
  verified    boolean default false,
  last4       text,
  is_public   boolean default true,
  created_at  timestamptz not null default now()
);

alter table offers enable row level security;
create policy "public_access" on offers for all using (true) with check (true);

-- ─── escrow ────────────────────────────────────────────────────────
create table escrow (
  id          uuid  primary key default gen_random_uuid(),
  deal_id     text  unique,
  buyer       text,
  cardholder  text,
  item        text,
  amount      numeric,
  fee         numeric,
  status      text  default 'held',
  created_at  timestamptz not null default now()
);

alter table escrow enable row level security;
create policy "public_access" on escrow for all using (true) with check (true);

-- ─── disputes ──────────────────────────────────────────────────────
create table disputes (
  id          uuid  primary key default gen_random_uuid(),
  dispute_id  text  unique,
  buyer       text,
  cardholder  text,
  item        text,
  amount      numeric,
  reason      text,
  status      text  default 'open',
  priority    text  default 'medium',
  created_at  timestamptz not null default now()
);

alter table disputes enable row level security;
create policy "public_access" on disputes for all using (true) with check (true);

-- ===================================================================
-- Seed Data
-- ===================================================================

insert into requests (title, amount, category, status, description, deadline, product_link, required_card, is_public) values
  ('Apple iPhone 16 Pro — 256GB', 134900, 'Electronics', 'pending',
   'Looking to purchase iPhone 16 Pro from Apple India official store.',
   '2026-04-15', 'https://apple.com/in', 'HDFC Bank', true),
  ('Levi''s 501 Original Fit Jeans', 3999, 'Fashion & Clothing', 'matched',
   'Levi''s 501 Original Fit Jeans size 32x32 in Dark Stonewash from Myntra.',
   '2026-04-10', 'https://myntra.com/levis', 'Any', true),
  ('boAt Airdopes 141 TWS Earbuds', 1299, 'Electronics', 'completed',
   'boAt Airdopes 141 Bluetooth TWS earbuds from Amazon India.',
   '2026-04-05', 'https://amazon.in/boat', 'ICICI Bank', false),
  ('Mamaearth Vitamin C Face Serum', 599, 'Beauty & Skincare', 'pending',
   'Mamaearth Vitamin C Face Serum 30ml from Nykaa.',
   '2026-04-12', 'https://nykaa.com/mamaearth', 'Any', true),
  ('MacBook Air M3 — 15-inch', 134900, 'Electronics', 'pending',
   'MacBook Air M3 15-inch, 8GB RAM, 256GB SSD in Silver from Apple.',
   '2026-04-18', 'https://apple.com/in/mac', 'SBI Card', false);

insert into offers (card_name, card_type, bank, categories, discount, cashback, max_amount, expiry, status, holder_name, deals_done, rating, verified) values
  ('Chase Sapphire Reserve', 'Visa Infinite', 'Chase',
   array['Travel','Hotels','Dining'], 10, 3, 5000, '2026-04-30', 'available', 'Alex M.', 12, 4.9, true),
  ('Amex Platinum', 'Amex Centurion', 'American Express',
   array['Electronics','Luxury','Hotels'], 15, 5, 10000, '2026-05-15', 'available', 'Sarah K.', 28, 5.0, true),
  ('Citi Prestige', 'Mastercard World Elite', 'Citibank',
   array['Travel','Dining','Hotels'], 12, 4, 8000, '2026-04-20', 'available', 'James R.', 7, 4.7, true),
  ('Discover it Cash Back', 'Discover', 'Discover',
   array['Electronics','Online Shopping'], 5, 5, 2000, '2026-06-30', 'available', 'Priya N.', 3, 4.5, false),
  ('Capital One Venture X', 'Visa Infinite', 'Capital One',
   array['Travel','Hotels','Car Rental'], 8, 2, 6000, '2026-05-31', 'available', 'Marcus T.', 19, 4.8, true);

insert into escrow (deal_id, buyer, cardholder, item, amount, fee, status) values
  ('ESC-001', 'John D.', 'Sarah K.', 'Amex Platinum — Electronics Deal', 1199, 23.98, 'held'),
  ('ESC-002', 'Maria L.', 'James R.', 'Citi Prestige — JFK to LHR Flight', 4500, 90.00, 'releasing'),
  ('ESC-003', 'Tom B.', 'Alex M.', 'Chase Sapphire — Hotel Dubai', 1200, 24.00, 'released');

insert into disputes (dispute_id, buyer, cardholder, item, amount, reason, status, priority) values
  ('DIS-001', 'John D.', 'Sarah K.', 'Electronics Deal — Sony Headphones', 349,
   'Cardholder did not complete the purchase within the agreed timeframe.', 'open', 'high'),
  ('DIS-002', 'Carlos M.', 'Priya N.', 'Electronics — MacBook Air M3', 1299,
   'Amount charged was higher than agreed upon.', 'investigating', 'medium'),
  ('DIS-003', 'Aisha P.', 'Alex M.', 'Hotel Booking — Hyatt Paris', 800,
   'Booking was cancelled by the cardholder without prior notice.', 'resolved', 'low');
