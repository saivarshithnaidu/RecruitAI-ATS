import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function InvitePage({ searchParams }: { searchParams: { token?: string } }) {
    const token = searchParams.token;

    if (!token) {
        redirect('/auth/signup');
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // 1. Log Click
        await supabase
            .from('invites')
            .update({
                clicked: true,
                clicked_at: new Date().toISOString()
            })
            .eq('token', token);

        // 2. Redirect to Registration/Application
        // We could pass the email via query param if we fetched it, 
        // but for security/simplicity, just sending to apply.
    } catch (e) {
        console.error("Invite Tracking Error:", e);
    }

    redirect('/apply');
}
