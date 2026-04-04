-- ===================================================================
-- OfferBridge — Update Schema (Offers)
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ===================================================================

-- Add new columns for card list management
alter table offers 
  add column if not exists last4 text,
  add column if not exists is_public boolean default true;

-- Show updated table schema status
select 'offers table updated successfully' as status;
