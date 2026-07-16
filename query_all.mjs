import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://rwjduhzfuqmblabhputj.supabase.co',
  'sb_publishable_ucFJiR7B_pzGX9VcYwo80Q_nyT9mSjw'
);

async function main() {
  const { data: invItems, error: e1 } = await supabase.from('inventory_items').select('*');
  if (e1) console.error(e1);
  const { data: salesReports, error: e2 } = await supabase.from('sales_reports').select('*');
  if (e2) console.error(e2);
  
  console.log("Inventory Items Count:", invItems?.length);
  if (invItems?.length > 0) console.log("Sample:", invItems[0]);

  console.log("\nSales Reports Count:", salesReports?.length);
  if (salesReports?.length > 0) console.log("Sample:", salesReports[0]);
}
main();
