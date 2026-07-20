-- Add borrowed column to inventory_items
ALTER TABLE inventory_items 
ADD COLUMN borrowed NUMERIC NOT NULL DEFAULT 0 CHECK (borrowed >= 0);

-- Update the notification trigger schema to include the new column when requested
NOTIFY pgrst, 'reload schema';
