-- 1. Create a storage bucket for receipts if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects if not already enabled (usually is by default in Supabase)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy to allow public access to view receipts
CREATE POLICY "Public View Receipts" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'receipts');

-- Policy to allow authenticated users to upload receipts
CREATE POLICY "Auth Upload Receipts" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');

-- 2. Update store_inventory table structure
-- Drop unit_price as it's no longer needed for the store
ALTER TABLE public.store_inventory DROP COLUMN IF EXISTS unit_price;

-- Rename quantity to closing
ALTER TABLE public.store_inventory RENAME COLUMN quantity TO closing;

-- Add new tracking columns
ALTER TABLE public.store_inventory ADD COLUMN IF NOT EXISTS opening INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.store_inventory ADD COLUMN IF NOT EXISTS supplied INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.store_inventory ADD COLUMN IF NOT EXISTS loaded INTEGER NOT NULL DEFAULT 0;
