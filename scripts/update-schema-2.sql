-- ===================================================================
-- OfferBridge — Update Schema (Contextual Match)
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ===================================================================

-- Add new columns for contextual mapping
alter table requests 
  add column if not exists product_link text,
  add column if not exists required_card text default 'Any',
  add column if not exists is_public boolean default true;

-- Show updated table schema status
select 'requests table updated successfully' as status;
