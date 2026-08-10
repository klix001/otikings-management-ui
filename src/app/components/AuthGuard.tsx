import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

/**
 * AuthGuard wraps protected layouts to enforce session-based access control.
 * - Uses getUser() to validate the session token against Supabase's server
 *   (getSession() only reads cached localStorage data, which can be stale/expired)
 * - Validates user role against allowed roles for the current route
 * - Listens for auth state changes (SIGNED_OUT, TOKEN_REFRESHED) and re-validates
 * - Replaces browser history on redirect so back-button can't revisit
 */
export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const redirectToLogin = useCallback(() => {
    setAuthorized(false);
    setLoading(false);
    navigate('/', { replace: true });
  }, [navigate]);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        // getUser() sends the token to Supabase's server for validation,
        // unlike getSession() which only reads from local storage.
        // This is the ONLY reliable way to verify a session is actually valid.
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          // Invalid/expired token or no session at all — clean up and redirect
          await supabase.auth.signOut();
          if (mounted) redirectToLogin();
          return;
        }

        // Check user role from profiles table
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError || !profile) {
          await supabase.auth.signOut();
          if (mounted) redirectToLogin();
          return;
        }

        // Check if this user's role is allowed on this route
        const isAllowed = allowedRoles.includes(profile.role);
        if (!isAllowed) {
          // User is authenticated but not authorized for this route
          await supabase.auth.signOut();
          if (mounted) redirectToLogin();
          return;
        }

        if (mounted) {
          setAuthorized(true);
          setLoading(false);
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        if (mounted) redirectToLogin();
      }
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        redirectToLogin();
      } else if (event === 'TOKEN_REFRESHED') {
        // Token was refreshed — re-validate to ensure the user is still authorized
        checkAuth();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, allowedRoles, location.pathname, redirectToLogin]);

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-neutral-50">
        <Loader2 className="w-10 h-10 animate-spin text-green-600 mb-3" />
        <p className="text-neutral-600 text-sm">Verifying session...</p>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return <>{children}</>;
}
