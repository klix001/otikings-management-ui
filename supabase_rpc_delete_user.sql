-- ============================================================
-- STAFF DELETE RPC - Run this in Supabase Dashboard -> SQL Editor
-- ============================================================
-- This FULLY removes a user from Supabase Auth + profiles.
-- Copy this ENTIRE script and run it.
-- ============================================================

-- Drop any old version
DROP FUNCTION IF EXISTS admin_delete_user(UUID);

CREATE OR REPLACE FUNCTION admin_delete_user(
  target_user_id UUID
) RETURNS void AS $$
DECLARE
  user_exists BOOLEAN;
BEGIN
  -- 1. Verify the target user actually exists
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = target_user_id) INTO user_exists;
  IF NOT user_exists THEN
    RAISE EXCEPTION 'User not found in auth.users';
  END IF;

  -- 2. Check if the caller is an admin
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) NOT IN ('admin', 'super_admin', 'superadmin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can delete users.';
  END IF;

  -- 3. Prevent self-deletion
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot delete your own account.';
  END IF;

  -- 4. Delete from public.profiles
  DELETE FROM public.profiles WHERE id = target_user_id;

  -- 5. Clear ALL auth child tables (foreign key constraints)
  DELETE FROM auth.sessions WHERE user_id = target_user_id;
  DELETE FROM auth.mfa_amr_claims WHERE session_id IN (
    SELECT id FROM auth.sessions WHERE user_id = target_user_id
  );
  DELETE FROM auth.mfa_factors WHERE user_id = target_user_id;
  DELETE FROM auth.mfa_challenges WHERE factor_id IN (
    SELECT id FROM auth.mfa_factors WHERE user_id = target_user_id
  );
  DELETE FROM auth.refresh_tokens WHERE session_id IN (
    SELECT id FROM auth.sessions WHERE user_id = target_user_id
  );
  DELETE FROM auth.identities WHERE user_id = target_user_id;
  DELETE FROM auth.one_time_tokens WHERE user_id = target_user_id;

  -- 6. Finally delete the auth user
  DELETE FROM auth.users WHERE id = target_user_id;

  -- 7. Verify it was actually deleted
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = target_user_id) INTO user_exists;
  IF user_exists THEN
    RAISE EXCEPTION 'Failed to delete user from auth.users - user still exists';
  END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
