import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://rwjduhzfuqmblabhputj.supabase.co',
  'sb_publishable_ucFJiR7B_pzGX9VcYwo80Q_nyT9mSjw'
);

async function main() {
  const { data: salesReports, error } = await supabase.from('sales_reports').select('*').limit(1);
  if (error) {
    console.error('Error fetching sales reports:', error);
  } else {
    console.log('Sales report columns:', Object.keys(salesReports[0] || {}));
  }
}
main();
