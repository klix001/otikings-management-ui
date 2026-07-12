-- Store Inventory: tracks stock levels in the physical store/warehouse
-- Supplier deliveries add to this, stockbook additions deduct from this

CREATE TABLE IF NOT EXISTS public.store_inventory (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    unit_price NUMERIC NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    department VARCHAR(50) NOT NULL DEFAULT 'bar' CHECK (department IN ('bar', 'kitchen')),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(name, department)
);

-- Enable RLS
ALTER TABLE public.store_inventory ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY admin_all ON public.store_inventory 
    FOR ALL USING (public.get_user_role() = 'admin');

-- Authenticated users can read
CREATE POLICY staff_select ON public.store_inventory 
    FOR SELECT USING (auth.role() = 'authenticated');

-- Bar staff can manage bar store
CREATE POLICY bar_staff_manage_bar ON public.store_inventory 
    FOR ALL USING (public.get_user_role() = 'bar' AND department = 'bar') 
    WITH CHECK (public.get_user_role() = 'bar' AND department = 'bar');

-- Kitchen staff can manage kitchen store
CREATE POLICY kitchen_staff_manage_kitchen ON public.store_inventory 
    FOR ALL USING (public.get_user_role() = 'kitchen' AND department = 'kitchen') 
    WITH CHECK (public.get_user_role() = 'kitchen' AND department = 'kitchen');
