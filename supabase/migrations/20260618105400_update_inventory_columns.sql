-- Rename supplied to addition column in inventory_items
ALTER TABLE public.inventory_items RENAME COLUMN supplied TO addition;

-- Add total column
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS total INTEGER NOT NULL DEFAULT 0 CHECK (total >= 0);

-- Add unit_price column
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS unit_price NUMERIC NOT NULL DEFAULT 0 CHECK (unit_price >= 0);
