-- Alter check constraint on sales_reports table to allow 'lodge'
ALTER TABLE public.sales_reports DROP CONSTRAINT IF EXISTS sales_reports_department_check;
ALTER TABLE public.sales_reports ADD CONSTRAINT sales_reports_department_check CHECK (department IN ('bar', 'kitchen', 'lodge'));

-- Alter check constraint on daily_signatures table to allow 'lodge'
ALTER TABLE public.daily_signatures DROP CONSTRAINT IF EXISTS daily_signatures_department_check;
ALTER TABLE public.daily_signatures ADD CONSTRAINT daily_signatures_department_check CHECK (department IN ('bar', 'kitchen', 'lodge'));
