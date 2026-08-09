-- ============================================================
-- STAFF DELETE RPC - Run this in Supabase Dashboard -> SQL Editor
-- ============================================================
-- This FULLY removes a user from Supabase Auth + profiles.
-- Copy this ENTIRE script and run it.
-- ============================================================

-- Drop any old version
DROP FUNCTION IF EXISTS admin_delete_user(UUID);
DROP FUNCTION IF EXISTS find_user_by_email(TEXT);

-- Helper function to search auth.users by email since public cannot query auth.users directly
CREATE OR REPLACE FUNCTION find_user_by_email(
  target_email TEXT
) RETURNS UUID AS $$
DECLARE
  found_user_id UUID;
BEGIN
  -- 1. Check if caller is admin
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) NOT IN ('admin', 'super_admin', 'superadmin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can query user information.';
  END IF;

  SELECT id INTO found_user_id FROM auth.users WHERE email = target_email LIMIT 1;
  RETURN found_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION admin_delete_user(
  target_user_id UUID
) RETURNS void AS $$
DECLARE
  _session_ids UUID[];
BEGIN
  -- 1. Check if the caller is an admin
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) NOT IN ('admin', 'super_admin', 'superadmin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can delete users.';
  END IF;

  -- 2. Prevent self-deletion
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot delete your own account.';
  END IF;

  -- 3. Collect session IDs BEFORE deleting anything
  SELECT ARRAY(SELECT id FROM auth.sessions WHERE user_id = target_user_id) INTO _session_ids;

  -- 4. Delete child tables in correct order (deepest children first)
  DELETE FROM auth.mfa_amr_claims WHERE session_id = ANY(_session_ids);
  DELETE FROM auth.refresh_tokens WHERE session_id = ANY(_session_ids);
  DELETE FROM auth.sessions WHERE user_id = target_user_id;
  DELETE FROM auth.mfa_challenges WHERE factor_id IN (
    SELECT id FROM auth.mfa_factors WHERE user_id = target_user_id
  );
  DELETE FROM auth.mfa_factors WHERE user_id = target_user_id;
  DELETE FROM auth.identities WHERE user_id = target_user_id;

  -- 5. Delete from profiles
  DELETE FROM public.profiles WHERE id = target_user_id;

  -- 6. Delete the auth user
  DELETE FROM auth.users WHERE id = target_user_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- CLEANUP: Remove ghost users that were only deleted from profiles
-- Run this ONCE to clean up previously broken deletes
-- ============================================================
DELETE FROM auth.identities WHERE user_id IN (
  SELECT au.id FROM auth.users au
  LEFT JOIN public.profiles p ON p.id = au.id
  WHERE p.id IS NULL
);
DELETE FROM auth.refresh_tokens WHERE session_id IN (
  SELECT s.id FROM auth.sessions s
  WHERE s.user_id IN (
    SELECT au.id FROM auth.users au
    LEFT JOIN public.profiles p ON p.id = au.id
    WHERE p.id IS NULL
  )
);
DELETE FROM auth.mfa_amr_claims WHERE session_id IN (
  SELECT s.id FROM auth.sessions s
  WHERE s.user_id IN (
    SELECT au.id FROM auth.users au
    LEFT JOIN public.profiles p ON p.id = au.id
    WHERE p.id IS NULL
  )
);
DELETE FROM auth.sessions WHERE user_id IN (
  SELECT au.id FROM auth.users au
  LEFT JOIN public.profiles p ON p.id = au.id
  WHERE p.id IS NULL
);
DELETE FROM auth.mfa_factors WHERE user_id IN (
  SELECT au.id FROM auth.users au
  LEFT JOIN public.profiles p ON p.id = au.id
  WHERE p.id IS NULL
);
DELETE FROM auth.users WHERE id IN (
  SELECT au.id FROM auth.users au
  LEFT JOIN public.profiles p ON p.id = au.id
  WHERE p.id IS NULL
);
