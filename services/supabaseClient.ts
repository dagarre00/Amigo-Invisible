
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Access environment variables safely across different environments (Vite/Node)
const getEnv = (key: string) => {
  try {
    // Vite / Modern Browsers
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {
    // Ignore syntax or access errors
  }

  try {
    // Node / Webpack / Classic
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env) {
      // @ts-ignore
      return process.env[key];
    }
  } catch (e) {
    // Ignore
  }
  
  return '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY');

let client: SupabaseClient | null = null;

if (supabaseUrl && supabaseKey) {
  try {
    client = createClient(supabaseUrl, supabaseKey);
  } catch (error) {
    console.error("Failed to initialize Supabase client:", error);
  }
} else {
  // Only warn in development console, do not crash
  console.log("Running in offline/local mode (Supabase credentials not found).");
}

export const supabase = client;
