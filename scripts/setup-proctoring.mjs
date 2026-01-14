import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!connectionString || !supabaseUrl || !supabaseServiceKey) {
    console.error('Missing credentials (DATABASE_URL, SUPABASE_URL, or SERVICE_KEY)');
    process.exit(1);
}

const sql = postgres(connectionString);
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupProctoring() {
    try {
        console.log('📦 Setting up Database Tables...');

        // 1. Create Tables
        await sql`
      CREATE TABLE IF NOT EXISTS exam_recordings (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        exam_assignment_id UUID NOT NULL, -- Links to the specific attempt (assignments/applications logic tbd, for now generic generic uuid linkage)
        candidate_id UUID, 
        video_path TEXT NOT NULL,
        duration_seconds INTEGER,
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `;
        console.log('   - exam_recordings created.');

        await sql`
      CREATE TABLE IF NOT EXISTS exam_proctor_logs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        exam_assignment_id UUID NOT NULL,
        candidate_id UUID,
        event_type TEXT NOT NULL,
        details JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `;
        console.log('   - exam_proctor_logs created.');

        // 2. Storage Bucket
        console.log('🪣 Setting up Storage Bucket...');
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();

        if (listError) {
            console.error('   ❌ Error listing buckets:', listError.message);
        } else {
            const bucketName = 'exam-recordings';
            const exists = buckets.find(b => b.name === bucketName);

            if (exists) {
                console.log(`   - Bucket '${bucketName}' already exists.`);
            } else {
                console.log(`   - Creating bucket '${bucketName}'...`);
                const { error: createError } = await supabase.storage.createBucket(bucketName, {
                    public: false, // PRIVATE bucket
                    fileSizeLimit: 524288000, // 500MB limit per file?
                    allowedMimeTypes: ['video/webm', 'video/mp4']
                });

                if (createError) console.error('   ❌ Failed to create bucket:', createError.message);
                else console.log(`   - ✅ Bucket '${bucketName}' created.`);
            }
        }

        console.log('✅ Setup Complete.');

    } catch (error) {
        console.error('❌ Error during setup:', error);
    } finally {
        await sql.end();
    }
}

setupProctoring();
