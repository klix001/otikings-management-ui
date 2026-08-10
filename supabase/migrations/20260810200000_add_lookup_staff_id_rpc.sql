-- RPC function to look up a staff member by their staff_id.
-- This is needed because the login flow must resolve a staff_id to an email
-- BEFORE the user is authenticated, but RLS on the profiles table blocks
-- unauthenticated reads. Using SECURITY DEFINER allows this function to
-- bypass RLS safely while only exposing the minimal data needed for login.

CREATE OR REPLACE FUNCTION public.lookup_staff_id(p_staff_id TEXT)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object('email', p.email, 'role', p.role)
  INTO result
  FROM public.profiles p
  WHERE p.staff_id = p_staff_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to the anon role so unauthenticated users
-- (i.e. users on the login page) can call this function
GRANT EXECUTE ON FUNCTION public.lookup_staff_id(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.lookup_staff_id(TEXT) TO authenticated;
