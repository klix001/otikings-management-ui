import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://rwjduhzfuqmblabhputj.supabase.co',
  'sb_publishable_ucFJiR7B_pzGX9VcYwo80Q_nyT9mSjw'
);

async function main() {
  const { data: invItems } = await supabase.from('inventory_items').select('date, sold, unit_price, name').eq('department', 'bar');
  
  const { data: salesReports } = await supabase.from('sales_reports').select('date, total_sales, stockbook_sales').eq('department', 'bar');
  
  console.log("Inventory Items:");
  invItems.forEach(i => console.log(i));
  console.log("\nSales Reports:");
  salesReports.forEach(r => console.log(r));
}
main();
