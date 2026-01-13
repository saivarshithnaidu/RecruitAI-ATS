import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('candidates')
            .select('*')
            .eq('email', session.user.email)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('MyApplication Fetch Error:', error);
            return NextResponse.json({ success: false, message: 'Failed to fetch application' }, { status: 500 });
        }

        // PGRST116 means no rows found, which is fine, just return null data
        return NextResponse.json({ success: true, data: data || null });

    } catch (error) {
        console.error('Unexpected Error in /api/my-application:', error);
        return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
}
