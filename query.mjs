import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function main() {
  const { data: items } = await supabase.from('inventory_items').select('date, sold, unit_price, department').eq('department', 'bar');
  console.log("Inventory items:", items);
  const { data: sales } = await supabase.from('sales_reports').select('date, total_sales, stockbook_sales, department').eq('department', 'bar');
  console.log("Sales reports:", sales);
}
main();
