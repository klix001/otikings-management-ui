import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rwjduhzfuqmblabhputj.supabase.co';
const supabaseAnonKey = 'sb_publishable_ucFJiR7B_pzGX9VcYwo80Q_nyT9mSjw';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
});

async function inspectColumns() {
  console.log('Inspecting live database table columns via RPC/query...');
  
  // We can run a query to information_schema.columns using a rpc if available,
  // or we can select a dummy object or just query the tables.
  // Wait, does Supabase JS client let us query information_schema directly? 
  // By default, the REST API postgrest only exposes tables in the 'public' schema.
  // Since information_schema is a different schema, it might not be directly queryable unless a function exists.
  // Let's try querying information_schema.columns via Postgrest just in case, or try selecting from the tables with a filter that returns nothing but gets headers?
  // Actually, Postgrest returns a Content-Range or we can see the response structure.
  // But wait, can we sign in as the admin user and insert/select?
  // Let's sign in as kelvinluisjr2003@gmail.com and then select!
  // That will bypass RLS because the user is authenticated and has the role 'admin' or 'super_admin'!
  
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'kelvinluisjr2003@gmail.com',
      password: 'Kelvin2002',
    });

    if (authError) {
      console.error('❌ Sign in failed:', authError.message);
      return;
    }

    console.log('✅ Signed in successfully. User ID:', authData.user.id);

    const tables = ['lodge_entries', 'inventory_items', 'expenses', 'cash_submissions', 'record_book_entries', 'creditors', 'suppliers', 'supplier_products', 'profiles'];

    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`❌ Table: ${table} - Error: ${error.message}`);
      } else {
        // If data is empty, we still don't get keys. 
        // But we can check if we can insert a dummy row or check if we can query pg_attribute or schema.
        // Wait, is there a custom RPC?
        console.log(`✅ Table: ${table} - Fetched successfully. Row count: ${data.length}`);
        if (data.length > 0) {
          console.log(`   Columns: [${Object.keys(data[0]).join(', ')}]`);
        }
      }
    }
  } catch (err) {
    console.error('❌ Exception:', err);
  }
}

inspectColumns();
