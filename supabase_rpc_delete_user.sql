-- Run this SQL in your Supabase Dashboard -> SQL Editor
-- This creates an RPC function that allows admins to fully delete a user
-- from both auth.users and public.profiles
--
-- IMPORTANT: Drop the old version first, then re-run this entire script.

-- Drop existing version if it exists
DROP FUNCTION IF EXISTS admin_delete_user(UUID);

CREATE OR REPLACE FUNCTION admin_delete_user(
  target_user_id UUID
) RETURNS void AS $$
BEGIN
  -- 1. Check if the caller is an admin
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) NOT IN ('admin', 'super_admin', 'superadmin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can delete users.';
  END IF;

  -- 2. Prevent self-deletion
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot delete your own account.';
  END IF;

  -- 3. Delete from public.profiles
  DELETE FROM public.profiles WHERE id = target_user_id;

  -- 4. Delete all auth-related child records first (foreign key constraints)
  DELETE FROM auth.sessions WHERE user_id = target_user_id;
  DELETE FROM auth.refresh_tokens WHERE user_id = target_user_id::text;
  DELETE FROM auth.mfa_factors WHERE user_id = target_user_id;
  DELETE FROM auth.identities WHERE user_id = target_user_id;

  -- 5. Now delete the auth user itself
  DELETE FROM auth.users WHERE id = target_user_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
