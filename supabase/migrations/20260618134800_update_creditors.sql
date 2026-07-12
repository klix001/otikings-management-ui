-- Add item_bought and phone_number columns to creditors table
ALTER TABLE public.creditors ADD COLUMN IF NOT EXISTS item_bought VARCHAR(255);
ALTER TABLE public.creditors ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);
