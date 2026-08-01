CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION admin_update_user(
  target_user_id UUID,
  new_email TEXT,
  new_password TEXT DEFAULT NULL
) RETURNS void AS $$
BEGIN
  -- 1. Check if the caller is an admin
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) NOT IN ('admin', 'super_admin', 'superadmin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can update user credentials.';
  END IF;

  -- 2. Update auth.users
  IF new_password IS NOT NULL AND new_password != '' THEN
    UPDATE auth.users 
    SET 
      email = COALESCE(new_email, email),
      encrypted_password = crypt(new_password, gen_salt('bf'))
    WHERE id = target_user_id;
  ELSE
    UPDATE auth.users 
    SET 
      email = COALESCE(new_email, email)
    WHERE id = target_user_id;
  END IF;
  
  -- 3. Update public.profiles
  UPDATE public.profiles
  SET email = COALESCE(new_email, email)
  WHERE id = target_user_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
