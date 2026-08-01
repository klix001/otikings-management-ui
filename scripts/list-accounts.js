import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rwjduhzfuqmblabhputj.supabase.co';
const supabaseAnonKey = 'sb_publishable_ucFJiR7B_pzGX9VcYwo80Q_nyT9mSjw';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
});

async function run() {
  // Sign in as dummy admin to bypass RLS
  await supabase.auth.signInWithPassword({
    email: 'admin_dummy_1784816631771@example.com',
    password: 'password123456'
  });

  const { data } = await supabase
    .from('profiles')
    .select('id, email, role, full_name, staff_id');

  console.log('=== ALL ACCOUNTS ===\n');
  for (const p of data) {
    const isTest = p.email.includes('dummy') || p.email.includes('example.com');
    console.log(`${isTest ? '🧪' : '👤'} ${p.full_name || '(unnamed)'}`);
    console.log(`   Email:    ${p.email}`);
    console.log(`   Role:     ${p.role}`);
    console.log(`   Staff ID: ${p.staff_id || 'N/A'}`);
    console.log(`   Test:     ${isTest ? 'YES (can be deleted)' : 'NO (real account)'}`);
    console.log('');
  }
}

run();
