-- Add new columns to lodge_entries for extended booking tracking
ALTER TABLE public.lodge_entries
ADD COLUMN IF NOT EXISTS room_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS days_paid INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS discount_applied NUMERIC DEFAULT 0;
