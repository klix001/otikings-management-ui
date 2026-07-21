import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const lines = envFile.split('\n');
let url = '';
let key = '';
for (let line of lines) {
  if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
}

async function run() {
  const res = await fetch(`${url}/rest/v1/inventory_items?department=eq.kitchen&select=date&order=date.desc&limit=1`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  const data = await res.json();
  console.log("Most recent date in DB:", data);
  
  const countRes = await fetch(`${url}/rest/v1/inventory_items?department=eq.kitchen&select=id,date&order=date.desc&limit=5`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  const countData = await countRes.json();
  console.log("Recent items:", countData);
}

run();
