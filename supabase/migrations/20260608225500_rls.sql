-- Row Level Security (RLS) and Role-Based Access Control Migration

-- -------------------------------------------------------------
-- 1. Profiles Table Setup
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'bar' CHECK (role IN ('admin', 'bar', 'kitchen')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------
-- 2. Trigger Function to Sync auth.users with public.profiles
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'bar')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute handle_new_user after signup/creation
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -------------------------------------------------------------
-- 3. Role Retrieval Helper Function
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS VARCHAR AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- -------------------------------------------------------------
-- 4. RLS Policies for Profiles
-- -------------------------------------------------------------
CREATE POLICY admin_manage_all ON public.profiles 
    FOR ALL USING (public.get_user_role() = 'admin');

CREATE POLICY user_read_own ON public.profiles 
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY user_update_own ON public.profiles 
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- -------------------------------------------------------------
-- 5. RLS Policies for Lodge Entries
-- -------------------------------------------------------------
ALTER TABLE public.lodge_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_all ON public.lodge_entries 
    FOR ALL USING (public.get_user_role() = 'admin');

CREATE POLICY staff_select ON public.lodge_entries 
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY staff_insert ON public.lodge_entries 
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- -------------------------------------------------------------
-- 6. RLS Policies for Inventory Items
-- -------------------------------------------------------------
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_all ON public.inventory_items 
    FOR ALL USING (public.get_user_role() = 'admin');

CREATE POLICY staff_select ON public.inventory_items 
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY bar_staff_manage_bar ON public.inventory_items 
    FOR ALL USING (public.get_user_role() = 'bar' AND department = 'bar') 
    WITH CHECK (public.get_user_role() = 'bar' AND department = 'bar');

CREATE POLICY kitchen_staff_manage_kitchen ON public.inventory_items 
    FOR ALL USING (public.get_user_role() = 'kitchen' AND department = 'kitchen') 
    WITH CHECK (public.get_user_role() = 'kitchen' AND department = 'kitchen');

-- -------------------------------------------------------------
-- 7. RLS Policies for Expenses
-- -------------------------------------------------------------
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_all ON public.expenses 
    FOR ALL USING (public.get_user_role() = 'admin');

CREATE POLICY staff_select ON public.expenses 
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY staff_insert ON public.expenses 
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- -------------------------------------------------------------
-- 8. RLS Policies for Cash Submissions
-- -------------------------------------------------------------
ALTER TABLE public.cash_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_all ON public.cash_submissions 
    FOR ALL USING (public.get_user_role() = 'admin');

CREATE POLICY staff_select ON public.cash_submissions 
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY staff_insert ON public.cash_submissions 
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- -------------------------------------------------------------
-- 9. RLS Policies for Record Book Entries
-- -------------------------------------------------------------
ALTER TABLE public.record_book_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_all ON public.record_book_entries 
    FOR ALL USING (public.get_user_role() = 'admin');

CREATE POLICY staff_select ON public.record_book_entries 
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY staff_insert ON public.record_book_entries 
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- -------------------------------------------------------------
-- 10. RLS Policies for Creditors
-- -------------------------------------------------------------
ALTER TABLE public.creditors ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_all ON public.creditors 
    FOR ALL USING (public.get_user_role() = 'admin');

CREATE POLICY staff_select ON public.creditors 
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY staff_insert ON public.creditors 
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY staff_update ON public.creditors 
    FOR UPDATE USING (auth.role() = 'authenticated') 
    WITH CHECK (auth.role() = 'authenticated');

-- -------------------------------------------------------------
-- 11. RLS Policies for Suppliers
-- -------------------------------------------------------------
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_all ON public.suppliers 
    FOR ALL USING (public.get_user_role() = 'admin');

CREATE POLICY staff_select ON public.suppliers 
    FOR SELECT USING (auth.role() = 'authenticated');

-- -------------------------------------------------------------
-- 12. RLS Policies for Supplier Products
-- -------------------------------------------------------------
ALTER TABLE public.supplier_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_all ON public.supplier_products 
    FOR ALL USING (public.get_user_role() = 'admin');

CREATE POLICY staff_select ON public.supplier_products 
    FOR SELECT USING (auth.role() = 'authenticated');
