import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const navigate = useNavigate();
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Redirect if already logged in
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        // Use getUser() to validate session against the server, not getSession()
        // which only reads from localStorage (can return stale/expired tokens)
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!userError && user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

          if (profile) {
            if (profile.role === 'bar') {
              navigate('/staff', { replace: true });
              return;
            } else if (profile.role === 'kitchen') {
              navigate('/kitchen-staff', { replace: true });
              return;
            } else if (['admin', 'super_admin', 'superadmin'].includes(profile.role)) {
              navigate('/admin', { replace: true });
              return;
            }
          }
        }
      } catch (err) {
        // Session check failed, show login form
      } finally {
        setCheckingSession(false);
      }
    };
    checkExistingSession();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let resolvedEmail = loginInput.trim();
      const isEmail = resolvedEmail.includes('@');

      if (isEmail) {
        // Email login: restricted to Admin/Super Admin
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: resolvedEmail,
          password,
        });

        if (authError) {
          throw new Error(authError.message);
        }

        if (!data.user) {
          throw new Error('User account not found.');
        }

        // Check user role from profiles table
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          await supabase.auth.signOut();
          throw new Error('Error fetching profile information.');
        }

        if (!profile) {
          await supabase.auth.signOut();
          throw new Error('User profile does not exist.');
        }

        const isAdmin = ['admin', 'super_admin', 'superadmin'].includes(profile.role);

        if (!isAdmin) {
          // If staff tries to log in using email, sign them out immediately
          await supabase.auth.signOut();
          throw new Error('Staff are not permitted to log in with an email address. Please use your Staff ID.');
        }

        navigate('/admin', { replace: true });
      } else {
        // Staff ID login: restricted to staff/admin roles (BAR/KIT/ADM prefixes)
        const normalizedInput = resolvedEmail.toUpperCase();
        const isBarId = normalizedInput.startsWith('BAR');
        const isKitId = normalizedInput.startsWith('KIT');
        const isAdminId = normalizedInput.startsWith('ADM');

        if (!isBarId && !isKitId && !isAdminId) {
          throw new Error('Staff ID must start with BAR, KIT, or ADM prefix.');
        }

        // Use RPC function to look up staff_id → email/role.
        // This bypasses RLS (which blocks unauthenticated reads on profiles)
        // using SECURITY DEFINER, so it works on any device before login.
        const { data: rpcResult, error: rpcError } = await supabase
          .rpc('lookup_staff_id', { p_staff_id: resolvedEmail });

        if (rpcError) {
          throw new Error('Error verifying Staff ID.');
        }

        // RPC returns null if no matching staff_id found
        const profile = rpcResult as { email: string; role: string } | null;

        if (!profile) {
          throw new Error('Invalid Staff ID. Please check and try again.');
        }

        // Enforce role and prefix alignment
        const expectedRole = isBarId ? 'bar' : isKitId ? 'kitchen' : 'admin';
        const isRoleMatch = (expectedRole === 'admin')
          ? ['admin', 'super_admin', 'superadmin'].includes(profile.role)
          : profile.role === expectedRole;

        if (!isRoleMatch) {
          throw new Error(`Department mismatch for this Staff ID (expected ${expectedRole} department).`);
        }

        resolvedEmail = profile.email;

        // Perform login
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: resolvedEmail,
          password,
        });

        if (authError) {
          throw new Error(authError.message);
        }

        if (!data.user) {
          throw new Error('User account not found.');
        }

        // Route based on role
        if (profile.role === 'bar') {
          navigate('/staff', { replace: true });
        } else if (profile.role === 'kitchen') {
          navigate('/kitchen-staff', { replace: true });
        } else if (['admin', 'super_admin', 'superadmin'].includes(profile.role)) {
          navigate('/admin', { replace: true });
        } else {
          throw new Error('Unauthorized role type for Staff ID login.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign in.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="max-w-md w-full p-8 bg-white rounded-2xl shadow-sm border border-neutral-200">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            Welcome Back
          </h1>
          <p className="text-neutral-600">Log in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Email Address or Staff ID
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-neutral-400" />
              </div>
              <input
                type="text"
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-neutral-900"
                placeholder="email@example.com or BAR00123456"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-neutral-400" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-neutral-900"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing In...' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

