import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rwjduhzfuqmblabhputj.supabase.co';
const supabaseAnonKey = 'sb_publishable_ucFJiR7B_pzGX9VcYwo80Q_nyT9mSjw';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
});

async function run() {
  const email = 'kelvinluisjr2003@gmail.com';
  const password = 'Kelvin2002';
  
  console.log(`Creating recovery admin account for ${email}...`);
  
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: email,
    password: password,
    options: {
      data: {
        role: 'admin',
        full_name: 'Recovery Admin'
      }
    }
  });

  if (signUpError) {
    if (signUpError.message.includes('already registered')) {
       console.log('An account with this email already exists. Attempting to log in and force update role to admin...');
       // We can't update role directly without login or service key. 
       // If it exists, they just need to use it.
       console.error('Error: Account already exists. If you are locked out, you must delete this user in the Supabase Dashboard first, then run this script again.');
    } else {
       console.error('Sign Up Error:', signUpError.message);
    }
    return;
  }

  if (signUpData.user) {
    console.log('✅ Recovery admin account successfully created!');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('You can now log into the Admin Dashboard using these credentials.');
  }
}

run();
