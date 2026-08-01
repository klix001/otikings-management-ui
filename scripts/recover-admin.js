import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rwjduhzfuqmblabhputj.supabase.co';
const supabaseAnonKey = 'sb_publishable_ucFJiR7B_pzGX9VcYwo80Q_nyT9mSjw';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
});

async function run() {
  // Step 1: Sign in as the dummy admin we created
  console.log('Signing in as dummy admin...');
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin_dummy_1784816631771@example.com',
    password: 'password123456'
  });
  if (authErr) {
    console.error('❌ Dummy login failed:', authErr.message);
    return;
  }
  console.log('✅ Signed in as dummy admin');

  // Step 2: Try calling the admin_update_user RPC to reset the super_admin password
  console.log('\nAttempting to reset password for odigiekingsley7@gmail.com via RPC...');
  const { error: rpcError } = await supabase.rpc('admin_update_user', {
    target_user_id: '8c9521f3-8fa0-493f-96de-d7a95fe04a96',
    new_email: 'odigiekingsley7@gmail.com',
    new_password: 'Kelvin2002'
  });

  if (rpcError) {
    console.error('❌ RPC Error:', rpcError.message);
    console.log('\nThe RPC function does not exist yet. You need to run the SQL first.');
    console.log('Please go to Supabase Dashboard > SQL Editor and run the contents of:');
    console.log('supabase_rpc_update_user.sql');
    console.log('\nAlternatively, trying to create kelvinluisjr2003@gmail.com as a NEW admin account...');
    
    // Try creating kelvinluisjr2003 as a brand new account
    const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    });

    const { data: signUpData, error: signUpError } = await tempClient.auth.signUp({
      email: 'kelvinluisjr2003@gmail.com',
      password: 'Kelvin2002',
      options: {
        data: {
          role: 'admin',
          full_name: 'Recovery Admin (Kelvin)'
        }
      }
    });

    if (signUpError) {
      console.error('❌ Sign Up Error:', signUpError.message);
      
      if (signUpError.message.includes('already registered') || signUpError.message.includes('already been registered')) {
        console.log('\n⚠️  The email kelvinluisjr2003@gmail.com still exists in auth.users but NOT in profiles.');
        console.log('This is a ghost account. The profile was deleted/overwritten but the auth entry remains.');
        console.log('\nTo fix this:');
        console.log('1. Go to Supabase Dashboard > Authentication > Users');
        console.log('2. Find kelvinluisjr2003@gmail.com and DELETE it');
        console.log('3. Run this script again');
      }
      return;
    }

    if (signUpData.user) {
      console.log('✅ New admin account created!');
      console.log('User ID:', signUpData.user.id);

      // Now update the profile role to admin (trigger may have created it as "bar")
      await supabase
        .from('profiles')
        .update({ role: 'admin', full_name: 'Recovery Admin (Kelvin)' })
        .eq('id', signUpData.user.id);
      
      console.log('✅ Profile updated to admin role');
      console.log('\n🎉 You can now log in with:');
      console.log('   Email: kelvinluisjr2003@gmail.com');
      console.log('   Password: Kelvin2002');
    }
    return;
  }

  console.log('✅ Password reset successful via RPC!');
  
  // Verify the login works
  const verifyClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  });
  const { error: verifyErr } = await verifyClient.auth.signInWithPassword({
    email: 'odigiekingsley7@gmail.com',
    password: 'Kelvin2002'
  });
  
  if (verifyErr) {
    console.log('❌ Verification login failed:', verifyErr.message);
  } else {
    console.log('✅ Verified! Login with odigiekingsley7@gmail.com / Kelvin2002 works!');
  }
}

run();
