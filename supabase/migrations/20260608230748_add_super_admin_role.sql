-- Alter profiles table to allow super_admin and superadmin roles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('admin', 'bar', 'kitchen', 'super_admin', 'superadmin'));

-- Override get_user_role() function to treat super_admin/superadmin as admin for RLS policy checks
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS VARCHAR AS $$
  SELECT CASE 
    WHEN role IN ('super_admin', 'superadmin') THEN 'admin'
    ELSE role
  END
  FROM public.profiles 
  WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;
