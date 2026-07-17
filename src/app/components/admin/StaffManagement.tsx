/// <reference types="vite/client" />
import { useState, useEffect } from 'react';
import { Plus, RefreshCw, Trash2, Edit2, Search, Key, UserCheck, Loader2, X, Eye, EyeOff, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

// Retrieve Supabase credentials for temporary client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  staff_id: string | null;
  created_at: string;
}

export default function StaffManagement() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('bar');
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('123456');
  const [customEmailEnabled, setCustomEmailEnabled] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Load current user details
  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (!profileErr && profile) {
          setCurrentUser({ id: user.id, role: profile.role });
        }
      }
    } catch (err) {
      console.error('Error fetching current user info:', err);
    }
  };

  // Load staff profiles
  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setProfiles(data || []);
    } catch (err: any) {
      console.error('Error fetching profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchProfiles();
  }, []);

  const isSuperAdmin = currentUser ? ['super_admin', 'superadmin'].includes(currentUser.role) : false;

  // Helper to generate unique Staff ID
  const generateStaffId = (selectedRole: string) => {
    const prefix = selectedRole === 'bar' ? 'BAR00' : selectedRole === 'kitchen' ? 'KIT00' : 'ADM00';
    // Generate 6 digit number
    const randomPart = Math.floor(100000 + Math.random() * 900000).toString();
    return `${prefix}${randomPart}`;
  };

  // Update staff ID when role or modal opens (only if not editing)
  useEffect(() => {
    if (isModalOpen && !editingProfile) {
      if (role === 'bar' || role === 'kitchen' || role === 'admin') {
        setStaffId(generateStaffId(role));
      } else {
        setStaffId('');
      }
    }
  }, [role, isModalOpen, editingProfile]);

  const handleAddStaff = () => {
    setEditingProfile(null);
    setFullName('');
    setRole('bar');
    setPassword('123456');
    setCustomEmailEnabled(false);
    setEmailInput('');
    setError('');
    setIsModalOpen(true);
  };

  const handleEditStaff = (profile: Profile) => {
    setEditingProfile(profile);
    setFullName(profile.full_name || '');
    setRole(profile.role);
    setStaffId(profile.staff_id || '');
    setEmailInput(profile.email);
    setPassword('');
    setCustomEmailEnabled(true);
    setError('');
    setIsModalOpen(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (!fullName.trim()) {
        throw new Error('Please enter name.');
      }

      const isStaffRole = role === 'bar' || role === 'kitchen' || role === 'admin';

      if (editingProfile) {
        // --- Edit flow ---
        const isEditingSelf = currentUser && editingProfile.id === currentUser.id;

        if (isStaffRole) {
          if (!staffId.trim()) {
            throw new Error('Please assign a Staff ID.');
          }
          const expectedPrefix = role === 'bar' ? 'BAR' : role === 'kitchen' ? 'KIT' : 'ADM';
          if (!staffId.trim().toUpperCase().startsWith(expectedPrefix)) {
            throw new Error(`Staff ID must start with ${expectedPrefix} for this department.`);
          }

          // Check if staff ID already exists (and belongs to another user)
          if (staffId !== editingProfile.staff_id) {
            const { data: existingId } = await supabase
              .from('profiles')
              .select('id')
              .eq('staff_id', staffId)
              .maybeSingle();

            if (existingId) {
              throw new Error('Staff ID already exists. Please generate a new one.');
            }
          }
        }

        // Update profile in database
        const profileUpdates: Record<string, any> = {
          full_name: fullName.trim(),
          staff_id: isStaffRole ? staffId.trim() : null
        };
        // Only update role if NOT editing self (to prevent lockout)
        if (!isEditingSelf) {
          profileUpdates.role = role;
        }

        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', editingProfile.id);

        if (profileError) throw profileError;

        // If editing self, update auth credentials (email/password) if changed
        if (isEditingSelf) {
          const authUpdates: Record<string, string> = {};
          if (emailInput.trim() && emailInput.trim() !== editingProfile.email) {
            authUpdates.email = emailInput.trim();
          }
          if (password && password.length > 0) {
            if (password.length < 6) {
              throw new Error('New password must be at least 6 characters.');
            }
            authUpdates.password = password;
          }

          if (Object.keys(authUpdates).length > 0) {
            const { error: authUpdateError } = await supabase.auth.updateUser(authUpdates);
            if (authUpdateError) throw authUpdateError;

            // If email changed, also update it in profiles table
            if (authUpdates.email) {
              await supabase
                .from('profiles')
                .update({ email: authUpdates.email })
                .eq('id', editingProfile.id);
            }
          }
        }

      } else {
        // --- Create flow ---
        if (isStaffRole) {
          if (!staffId.trim()) {
            throw new Error('Staff ID was not generated.');
          }
        }

        // Check password length
        if (!password || password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }

        // Compute final email
        const targetEmail = isStaffRole
          ? `${staffId.toLowerCase()}@lodge.com`
          : emailInput.trim();

        if (!targetEmail.includes('@')) {
          throw new Error('Please enter a valid email address.');
        }

        // Check if staff ID already exists (for staff roles)
        if (isStaffRole) {
          const { data: existingId } = await supabase
            .from('profiles')
            .select('id')
            .eq('staff_id', staffId)
            .maybeSingle();

          if (existingId) {
            throw new Error('Staff ID already exists. Please regenerate.');
          }
        }

        // Check if email already exists
        const { data: existingEmail } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', targetEmail)
          .maybeSingle();

        if (existingEmail) {
          throw new Error('This email address is already registered.');
        }

        // Create temporary client to avoid signing out the current admin
        const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: { persistSession: false }
        });

        // Sign up new user
        const { data: signUpData, error: signUpError } = await tempClient.auth.signUp({
          email: targetEmail,
          password,
          options: {
            data: {
              role: role,
              full_name: fullName.trim()
            }
          }
        });

        if (signUpError) {
          if (signUpError.message.toLowerCase().includes('rate limit') || signUpError.message.toLowerCase().includes('email')) {
            throw new Error('Supabase email rate limit exceeded. To fix this, please open your Supabase Dashboard -> Go to Authentication -> Providers -> Email -> Turn "Confirm email" OFF. This will enable instant signup without verification emails.');
          }
          throw signUpError;
        }
        if (!signUpData.user) throw new Error('Failed to create account.');

        // Update profile in database
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            staff_id: isStaffRole ? staffId : null,
            full_name: fullName.trim(),
            role: role
          })
          .eq('id', signUpData.user.id);

        if (profileError) throw profileError;
      }

      // Success
      setIsModalOpen(false);
      fetchProfiles();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProfile = async (id: string, name: string) => {
    const userInput = window.prompt(`Type "delete" to confirm deleting profile for ${name}:`);
    if (userInput?.toLowerCase() !== 'delete') {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      fetchProfiles();
    } catch (err: any) {
      alert(err.message || 'Failed to delete profile.');
    }
  };

  // Filter profiles based on search query and role filter
  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch =
      (p.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.staff_id || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'all' || p.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Staff & User Management</h1>
          <p className="text-neutral-600">Generate staff credentials and manage user accounts</p>
        </div>
        <button
          onClick={handleAddStaff}
          className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-medium px-5 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Add Staff / User</span>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by name, email, or Staff ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-neutral-900"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all bg-white text-neutral-800"
          >
            <option value="all">All Roles</option>
            <option value="bar">Bar Staff</option>
            <option value="kitchen">Kitchen Staff</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
          <button
            onClick={fetchProfiles}
            className="p-2.5 border border-neutral-300 rounded-lg text-neutral-600 hover:bg-neutral-50 transition-colors"
            title="Refresh List"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Profiles Table */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
            <Loader2 className="w-10 h-10 animate-spin text-orange-600 mb-3" />
            <p>Loading user accounts...</p>
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="text-center py-16 text-neutral-500">
            <UserCheck className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <p className="text-lg font-medium text-neutral-700">No accounts found</p>
            <p className="text-sm text-neutral-500 mt-1">Try modifying your filters or add a new user.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Staff ID</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-sm text-neutral-800">
                {filteredProfiles.map((p) => {
                  const isCurrentProfile = currentUser && p.id === currentUser.id;
                  const isTargetAdmin = ['admin', 'super_admin', 'superadmin'].includes(p.role);

                  // Decide if actions (edit/delete) are allowed
                  // Admins can always edit their own profile
                  const canEdit = isCurrentProfile || (!isTargetAdmin || isSuperAdmin);
                  const canDelete = !isCurrentProfile && (!isTargetAdmin || isSuperAdmin);

                  return (
                    <tr key={p.id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="px-6 py-4 font-medium text-neutral-900">
                        {p.full_name || 'Unnamed User'} {isCurrentProfile && <span className="text-xs text-neutral-400 font-normal">(You)</span>}
                      </td>
                      <td className="px-6 py-4">
                        {p.staff_id ? (
                          <span className="font-mono bg-neutral-100 text-neutral-800 border border-neutral-300 px-2.5 py-1 rounded text-xs font-semibold">
                            {p.staff_id}
                          </span>
                        ) : (
                          <span className="text-xs text-neutral-400 italic">None (Admin)</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-neutral-600 font-mono text-xs">{p.email}</td>
                      <td className="px-6 py-4">
                        {p.role === 'super_admin' || p.role === 'superadmin' ? (
                          <span className="bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-purple-200 flex items-center gap-1 w-fit">
                            <Shield className="w-3 h-3" /> Super Admin
                          </span>
                        ) : p.role === 'admin' ? (
                          <span className="bg-orange-50 text-orange-700 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-orange-200">
                            Admin
                          </span>
                        ) : p.role === 'bar' ? (
                          <span className="bg-green-50 text-green-700 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-green-200">
                            Bar Staff
                          </span>
                        ) : (
                          <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-blue-200">
                            Kitchen Staff
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-neutral-500">
                        {new Date(p.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          {canEdit && (
                            <button
                              onClick={() => handleEditStaff(p)}
                              className="text-neutral-600 hover:text-orange-600 p-1.5 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit account details"
                            >
                              <Edit2 className="w-4.5 h-4.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteProfile(p.id, p.full_name || p.email)}
                              className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete account"
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-neutral-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
              <h2 className="text-xl font-bold text-neutral-900">
                {editingProfile ? 'Edit Account Details' : 'Add New Account'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveStaff} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-200">
                  {error}
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-neutral-900"
                />
              </div>

              {/* Role Selection */}
              {(() => {
                const isEditingSelf = editingProfile && currentUser && editingProfile.id === currentUser.id;
                return (
                  <div>
                    <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                      Role / Department {isEditingSelf && <span className="text-xs font-normal text-neutral-400">(Locked — cannot change your own role)</span>}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <button
                        type="button"
                        onClick={() => !isEditingSelf && setRole('bar')}
                        disabled={!!isEditingSelf}
                        className={`py-2.5 px-3 border rounded-xl font-medium transition-all text-sm ${isEditingSelf ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                          } ${role === 'bar'
                            ? 'border-green-600 bg-green-50 text-green-700 ring-2 ring-green-600/20'
                            : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                          }`}
                      >
                        Bar Staff
                      </button>
                      <button
                        type="button"
                        onClick={() => !isEditingSelf && setRole('kitchen')}
                        disabled={!!isEditingSelf}
                        className={`py-2.5 px-3 border rounded-xl font-medium transition-all text-sm ${isEditingSelf ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                          } ${role === 'kitchen'
                            ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-600/20'
                            : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                          }`}
                      >
                        Kitchen Staff
                      </button>
                      {isSuperAdmin && (
                        <button
                          type="button"
                          onClick={() => !isEditingSelf && setRole('admin')}
                          disabled={!!isEditingSelf}
                          className={`py-2.5 px-3 border rounded-xl font-medium transition-all text-sm ${isEditingSelf ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                            } ${role === 'admin'
                              ? 'border-orange-600 bg-orange-50 text-orange-700 ring-2 ring-orange-600/20'
                              : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                            }`}
                        >
                          Admin
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Generated Staff ID (hidden for Super Admins) */}
              {role !== 'super_admin' && role !== 'superadmin' && (
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                    Staff ID
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={staffId}
                        onChange={(e) => setStaffId(e.target.value)}
                        className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-lg outline-none text-neutral-800 font-mono font-bold"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setStaffId(generateStaffId(role))}
                      className="px-3 border border-neutral-300 rounded-lg text-neutral-600 hover:bg-neutral-50 transition-colors flex items-center justify-center cursor-pointer"
                      title="Regenerate Staff ID"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    Prefix-based 6-digit ID (starting with BAR, KIT, or ADM) used for login.
                  </p>
                </div>
              )}

              {/* Email Options (Only shown during Edit Flow) */}
              {editingProfile && (() => {
                const isEditingSelf = currentUser && editingProfile.id === currentUser.id;
                
                return (
                  <div>
                    <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                      Email Address {!isEditingSelf && <span className="text-xs font-normal text-neutral-400">(Read-Only)</span>}
                    </label>
                    {isEditingSelf ? (
                      <input
                        type="email"
                        required
                        placeholder="your.email@example.com"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className="w-full px-3.5 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-neutral-900"
                      />
                    ) : (
                      <input
                        type="email"
                        readOnly
                        value={emailInput}
                        className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-500 font-mono text-xs cursor-not-allowed outline-none"
                      />
                    )}
                  </div>
                );
              })()}

              {/* Password — shown during creation OR when editing own profile */}
              {(!editingProfile || (editingProfile && currentUser && editingProfile.id === currentUser.id)) && (
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1.5 flex justify-between items-center">
                    <span>{editingProfile ? 'New Password' : 'Password'} {editingProfile && <span className="text-xs font-normal text-neutral-400">(leave blank to keep current)</span>}</span>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                    >
                      {showPassword ? <span className="flex items-center gap-1"><EyeOff className="w-3.5 h-3.5" /> Hide</span> : <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> Show</span>}
                    </button>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={!editingProfile}
                    placeholder={editingProfile ? 'Enter new password to change' : 'Password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-neutral-900"
                  />
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="px-4.5 py-2.5 border border-neutral-300 hover:bg-neutral-50 text-neutral-700 font-medium rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-medium rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingProfile ? 'Save Changes' : 'Create Account'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
