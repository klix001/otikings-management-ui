-- Add stockbook_sales column to sales_reports table
-- This stores the auto-calculated revenue from the stockbook (sold × unit_price)
ALTER TABLE public.sales_reports
ADD COLUMN IF NOT EXISTS stockbook_sales NUMERIC NOT NULL DEFAULT 0;
