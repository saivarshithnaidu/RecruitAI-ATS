import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLES } from "@/lib/roles";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        // @ts-ignore
        if (session.user.role !== ROLES.ADMIN) {
            return NextResponse.json({ success: false, message: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Fetch all candidate profiles
        // We assume 'candidate_profiles' has all the necessary fields as per previous investigation
        const { data: profiles, error } = await supabaseAdmin
            .from('candidate_profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching candidate profiles:', error);
            return NextResponse.json({ success: false, message: 'Failed to fetch candidates' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data: profiles
        });

    } catch (error: any) {
        console.error('Unexpected error in /api/admin/candidates:', error);
        return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
