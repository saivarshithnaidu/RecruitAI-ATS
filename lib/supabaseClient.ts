import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    // We don't throw error here to avoid crashing entire client app if misconfigured, 
    // but auth functions will fail.
}

export const supabaseClient = createClient(supabaseUrl || '', supabaseAnonKey || '', {
    auth: {
        persistSession: true, // Persist session in localStorage
        autoRefreshToken: true,
    },
});
