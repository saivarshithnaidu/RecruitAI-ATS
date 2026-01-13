
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log('Debug Route: Fetching applications...');

        // 1. Count all
        const { count, error: countError } = await supabaseAdmin
            .from('applications')
            .select('*', { count: 'exact', head: true });

        // 2. Fetch first 5
        const { data, error } = await supabaseAdmin
            .from('applications')
            .select('*')
            .limit(5);

        if (error || countError) {
            return NextResponse.json({
                success: false,
                error: error || countError,
                message: 'DB Error'
            });
        }

        return NextResponse.json({
            success: true,
            count,
            first_5: data
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message });
    }
}
