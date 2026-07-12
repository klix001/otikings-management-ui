-- Migration to add staff_name to cash_submissions table
ALTER TABLE public.cash_submissions ADD COLUMN IF NOT EXISTS staff_name VARCHAR(255);
