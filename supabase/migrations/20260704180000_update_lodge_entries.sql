-- Add customer_name to lodge_entries
ALTER TABLE public.lodge_entries 
ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);

-- Make legacy columns optional
ALTER TABLE public.lodge_entries
ALTER COLUMN customers DROP NOT NULL,
ALTER COLUMN price_per_customer DROP NOT NULL;
