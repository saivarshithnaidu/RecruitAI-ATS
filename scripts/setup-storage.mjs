import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupBucket() {
    console.log('🪣 Setting up Storage Bucket "exam-recordings"...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
        console.error('❌ Error listing buckets:', listError.message);
        return;
    }

    const bucketName = 'exam-recordings';
    const exists = buckets.find(b => b.name === bucketName);

    if (exists) {
        console.log(`✅ Bucket '${bucketName}' already exists.`);
    } else {
        console.log(`- Creating bucket '${bucketName}'...`);
        const { error: createError } = await supabase.storage.createBucket(bucketName, {
            public: false,
            fileSizeLimit: 524288000,
            allowedMimeTypes: ['video/webm', 'video/mp4']
        });

        if (createError) console.error('❌ Failed to create bucket:', createError.message);
        else console.log(`✅ Bucket '${bucketName}' created.`);
    }
}

setupBucket();
