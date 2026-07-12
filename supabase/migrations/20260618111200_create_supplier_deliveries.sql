-- Create supplier_deliveries table
CREATE TABLE IF NOT EXISTS public.supplier_deliveries (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    supplier VARCHAR(255) NOT NULL,
    price NUMERIC NOT NULL DEFAULT 0 CHECK (price >= 0),
    items VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    item_qty_per_pack INTEGER NOT NULL DEFAULT 1 CHECK (item_qty_per_pack >= 1),
    receipt_url TEXT,
    department VARCHAR(50) NOT NULL DEFAULT 'bar' CHECK (department IN ('bar', 'kitchen')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on supplier_deliveries
ALTER TABLE public.supplier_deliveries ENABLE ROW LEVEL SECURITY;

-- Admin can manage all records
CREATE POLICY admin_all ON public.supplier_deliveries 
    FOR ALL USING (public.get_user_role() = 'admin');

-- Authenticated users can read/select all records
CREATE POLICY staff_select ON public.supplier_deliveries 
    FOR SELECT USING (auth.role() = 'authenticated');

-- Bar staff can insert/update/delete bar deliveries
CREATE POLICY bar_staff_manage_bar ON public.supplier_deliveries 
    FOR ALL USING (public.get_user_role() = 'bar' AND department = 'bar') 
    WITH CHECK (public.get_user_role() = 'bar' AND department = 'bar');

-- Kitchen staff can insert/update/delete kitchen deliveries
CREATE POLICY kitchen_staff_manage_kitchen ON public.supplier_deliveries 
    FOR ALL USING (public.get_user_role() = 'kitchen' AND department = 'kitchen') 
    WITH CHECK (public.get_user_role() = 'kitchen' AND department = 'kitchen');
