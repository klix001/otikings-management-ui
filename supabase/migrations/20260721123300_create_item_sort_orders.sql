-- Create item_sort_orders table to store permanent sequential item arrangement per department
CREATE TABLE IF NOT EXISTS public.item_sort_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  department text NOT NULL,
  item_name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  UNIQUE(department, item_name)
);

-- Enable RLS
ALTER TABLE public.item_sort_orders ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read the sort orders
CREATE POLICY "Allow read access to all authenticated users" 
  ON public.item_sort_orders FOR SELECT TO authenticated USING (true);

-- Allow admins/super_admins to update or insert sort orders
CREATE POLICY "Allow insert/update for admins" 
  ON public.item_sort_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
