import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
s.from('profiles').select('*').limit(1).then(({data, error}) => {
    if (error) console.log('Profiles error:', error.message);
    else console.log('Profiles columns:', Object.keys(data[0] || {}));
    process.exit(0);
});
