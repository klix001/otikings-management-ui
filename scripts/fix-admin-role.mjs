// Debug script: Check and fix the admin profile role
// Run with: node scripts/fix-admin-role.mjs

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rwjduhzfuqmblabhputj.supabase.co';
const supabaseAnonKey = 'sb_publishable_ucFJiR7B_pzGX9VcYwo80Q_nyT9mSjw';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
});

async function fixAdminRole() {
  // First, sign in as the admin to get their user id and session
  console.log('Signing in as kelvinluisjr2003@gmail.com...\n');

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'kelvinluisjr2003@gmail.com',
    password: 'Kelvin2002',
  });

  if (authError) {
    console.error('❌ Auth error:', authError.message);
    process.exit(1);
  }

  const userId = authData.user.id;
  console.log('✅ Signed in. User ID:', userId);

  // Read the current profile
  const { data: profile, error: readError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (readError) {
    console.error('❌ Error reading profile:', readError.message);
  } else if (profile) {
    console.log('\n📋 Current profile:');
    console.log('   id:', profile.id);
    console.log('   email:', profile.email);
    console.log('   full_name:', profile.full_name);
    console.log('   role:', profile.role);
    console.log('   staff_id:', profile.staff_id);
  } else {
    console.log('⚠️  No profile found for this user!');
  }

  // Try updating role to super_admin first
  console.log('\nAttempting to set role to super_admin...');
  const { data: d1, error: e1 } = await supabase
    .from('profiles')
    .update({ role: 'super_admin', full_name: 'Kelvin Luis Jr' })
    .eq('id', userId)
    .select();

  if (e1) {
    console.log('⚠️  super_admin failed:', e1.message);
    
    // Fallback: try 'admin' role
    console.log('Falling back to role = admin...');
    const { data: d2, error: e2 } = await supabase
      .from('profiles')
      .update({ role: 'admin', full_name: 'Kelvin Luis Jr' })
      .eq('id', userId)
      .select();

    if (e2) {
      console.error('❌ admin also failed:', e2.message);
    } else {
      console.log('✅ Role set to admin. Updated profile:', d2);
    }
  } else {
    console.log('✅ Role set to super_admin. Updated profile:', d1);
  }

  await supabase.auth.signOut();
  console.log('\n🎉 Done. Try logging in again.');
}

fixAdminRole();
