// Seed script: Create the initial Super Admin account in Supabase
// Run with: node scripts/seed-admin.mjs

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rwjduhzfuqmblabhputj.supabase.co';
const supabaseAnonKey = 'sb_publishable_ucFJiR7B_pzGX9VcYwo80Q_nyT9mSjw';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
});

async function seedAdmin() {
  console.log('Creating Super Admin account...\n');

  const { data, error } = await supabase.auth.signUp({
    email: 'kelvinluisjr2003@gmail.com',
    password: 'Kelvin2002',
    options: {
      data: {
        role: 'super_admin',
        full_name: 'Kelvin Luis Jr'
      }
    }
  });

  if (error) {
    console.error('❌ Error creating admin:', error.message);
    process.exit(1);
  }

  if (!data.user) {
    console.error('❌ No user returned from signup.');
    process.exit(1);
  }

  console.log('✅ Auth user created:', data.user.id);
  console.log('   Email:', data.user.email);

  // The handle_new_user trigger should have created the profile with the role from metadata.
  // But let's make sure the role is set to super_admin in profiles.
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ role: 'super_admin', full_name: 'Kelvin Luis Jr' })
    .eq('id', data.user.id);

  if (updateError) {
    console.warn('⚠️  Could not update profile role (might need manual update):', updateError.message);
  } else {
    console.log('✅ Profile role set to: super_admin');
  }

  console.log('\n🎉 Done! You can now log in at the admin portal with:');
  console.log('   Email:    kelvinluisjr2003@gmail.com');
  console.log('   Password: Kelvin2002');
}

seedAdmin();
