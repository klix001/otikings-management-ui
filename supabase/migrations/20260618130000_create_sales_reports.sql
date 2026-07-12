-- Create sales_reports table
CREATE TABLE IF NOT EXISTS public.sales_reports (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_sales NUMERIC NOT NULL DEFAULT 0 CHECK (total_sales >= 0),
    cash_at_hand NUMERIC NOT NULL DEFAULT 0 CHECK (cash_at_hand >= 0),
    pos_transfer NUMERIC NOT NULL DEFAULT 0 CHECK (pos_transfer >= 0),
    not_paid NUMERIC NOT NULL DEFAULT 0 CHECK (not_paid >= 0),
    additions_summary JSONB DEFAULT '[]'::jsonb,
    department VARCHAR(50) NOT NULL DEFAULT 'bar' CHECK (department IN ('bar', 'kitchen')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(date, department)
);

-- Enable RLS
ALTER TABLE public.sales_reports ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY admin_all ON public.sales_reports 
    FOR ALL USING (public.get_user_role() = 'admin');

-- Authenticated users can read
CREATE POLICY staff_select ON public.sales_reports 
    FOR SELECT USING (auth.role() = 'authenticated');

-- Bar staff can manage bar sales
CREATE POLICY bar_staff_manage_bar ON public.sales_reports 
    FOR ALL USING (public.get_user_role() = 'bar' AND department = 'bar') 
    WITH CHECK (public.get_user_role() = 'bar' AND department = 'bar');

-- Kitchen staff can manage kitchen sales
CREATE POLICY kitchen_staff_manage_kitchen ON public.sales_reports 
    FOR ALL USING (public.get_user_role() = 'kitchen' AND department = 'kitchen') 
    WITH CHECK (public.get_user_role() = 'kitchen' AND department = 'kitchen');
