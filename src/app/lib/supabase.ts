/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rwjduhzfuqmblabhputj.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ucFJiR7B_pzGX9VcYwo80Q_nyT9mSjw';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Please configure it in your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
