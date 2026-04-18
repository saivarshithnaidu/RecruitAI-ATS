import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSchema() {
    console.log('--- EXAMS SCHEMA ---');
    const { data: exams, error: e1 } = await supabase.from('exams').select('*').limit(1);
    if (e1) console.log('Exams info:', e1.message);
    else console.log('Exams columns:', Object.keys(exams[0] || {}));

    console.log('\n--- EXAM_QUESTIONS SCHEMA ---');
    const { data: qs, error: e2 } = await supabase.from('exam_questions').select('*').limit(1);
    if (e2) console.log('Exam Questions info:', e2.message);
    else console.log('Exam Questions columns:', Object.keys(qs[0] || {}));
}

checkSchema();
