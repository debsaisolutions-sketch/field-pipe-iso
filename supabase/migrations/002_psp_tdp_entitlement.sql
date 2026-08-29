-- PipeSketch Pro × TradeDeskPro entitlement tracking
-- Safe on shared Supabase project. Does not modify billing for existing subscribers.

alter table public.profiles
  add column if not exists psp_tdp_addon_active boolean not null default false;

comment on column public.profiles.psp_tdp_addon_active is
  'True when a TDP Starter/Pro customer has the PipeSketch Pro add-on subscription.';

-- Backfill add-on flag for existing TDP add-on customers (not Complete-included, not standalone).
update public.profiles
set psp_tdp_addon_active = true
where pipesketchpro_active = true
  and coalesce(psp_standalone, false) = false
  and coalesce(tier_int, 0) < 3
  and psp_tdp_addon_active = false;
