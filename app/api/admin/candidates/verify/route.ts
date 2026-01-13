import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLES } from "@/lib/roles";

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        // @ts-ignore
        if (session.user.role !== ROLES.ADMIN) {
            return NextResponse.json({ success: false, message: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const body = await request.json();
        const { user_id, action } = body;

        if (!user_id || !['approve', 'reject'].includes(action)) {
            return NextResponse.json({ success: false, message: 'Invalid request body' }, { status: 400 });
        }

        const updates = {
            verified_by_admin: action === 'approve',
            verification_status: action === 'approve' ? 'verified' : 'rejected',
            updated_at: new Date().toISOString()
        };

        const { error } = await supabaseAdmin
            .from('candidate_profiles')
            .update(updates)
            .eq('user_id', user_id);

        if (error) {
            console.error(`Error updating candidate status (${action}):`, error);
            return NextResponse.json({ success: false, message: 'Database update failed' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `Candidate ${action === 'approve' ? 'approved' : 'rejected'} successfully`
        });

    } catch (error: any) {
        console.error('Unexpected error in /api/admin/candidates/verify:', error);
        return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
