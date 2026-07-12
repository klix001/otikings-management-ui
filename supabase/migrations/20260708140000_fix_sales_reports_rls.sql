-- Drop existing restricted policies on sales_reports
DROP POLICY IF EXISTS admin_all ON public.sales_reports;
DROP POLICY IF EXISTS staff_select ON public.sales_reports;
DROP POLICY IF EXISTS bar_staff_manage_bar ON public.sales_reports;
DROP POLICY IF EXISTS kitchen_staff_manage_kitchen ON public.sales_reports;

-- Recreate policies with wider authenticated user access (similar to lodge_entries/expenses)
CREATE POLICY admin_all ON public.sales_reports 
    FOR ALL USING (public.get_user_role() = 'admin');

CREATE POLICY staff_select ON public.sales_reports 
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY staff_insert ON public.sales_reports 
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY staff_update ON public.sales_reports 
    FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
