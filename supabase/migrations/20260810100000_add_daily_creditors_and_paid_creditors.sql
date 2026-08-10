-- Add daily_creditors JSONB column to sales_reports
-- Stores array of creditor objects: [{ "name": "John", "amount": 5000, "item": "Whiskey", "phone": "08012345678" }]
ALTER TABLE public.sales_reports
ADD COLUMN IF NOT EXISTS daily_creditors JSONB DEFAULT '[]'::jsonb;

-- Add paid_creditors NUMERIC column to pos_breakdowns
-- Tracks total amount paid by creditors via POS for the day
ALTER TABLE public.pos_breakdowns
ADD COLUMN IF NOT EXISTS paid_creditors NUMERIC NOT NULL DEFAULT 0;
