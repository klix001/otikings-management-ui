-- Migration to add staff_id to public.profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS staff_id VARCHAR(50) UNIQUE;
