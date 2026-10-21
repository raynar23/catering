-- Migration: 012_profiles_no_hp
-- Add no_hp column to profiles table and grant column update to authenticated users

alter table public.profiles
  add column if not exists no_hp text;

-- Grant column update on no_hp to authenticated role
grant update (no_hp) on public.profiles to authenticated;
