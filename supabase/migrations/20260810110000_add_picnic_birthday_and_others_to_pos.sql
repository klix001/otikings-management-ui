-- Add picnic_birthday NUMERIC column to pos_breakdowns
-- Tracks POS income from picnic or birthday rentals for the day
ALTER TABLE public.pos_breakdowns
ADD COLUMN IF NOT EXISTS picnic_birthday NUMERIC NOT NULL DEFAULT 0;

-- Add other_deductions JSONB column to pos_breakdowns
-- Stores flexible custom POS line items: [{ "label": "Pool Party", "amount": 5000 }]
ALTER TABLE public.pos_breakdowns
ADD COLUMN IF NOT EXISTS other_deductions JSONB DEFAULT '[]'::jsonb;
