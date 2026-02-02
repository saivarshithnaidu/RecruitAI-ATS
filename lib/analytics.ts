import { supabaseAdmin } from "./supabaseAdmin";
import { headers } from "next/headers";

export async function logInviteClick(metadata: {
    source: 'generic_invite' | 'exam_invite';
    invite_id?: string; // ID from 'invites' table
    assignment_id?: string; // ID from 'exam_assignments' table
    ip?: string;
    userAgent?: string;
}) {
    const headersList = await headers();
    const ip = metadata.ip || headersList.get('x-forwarded-for') || 'Unknown';
    const userAgent = metadata.userAgent || headersList.get('user-agent') || 'Unknown';
    const country = headersList.get('x-vercel-ip-country') || 'Unknown';
    const city = headersList.get('x-vercel-ip-city') || 'Unknown';

    // Basic Referrer extraction
    const referer = headersList.get('referer') || 'Direct';

    // Simple Device Detection
    let device = 'Desktop';
    if (/mobile/i.test(userAgent)) device = 'Mobile';
    else if (/tablet/i.test(userAgent) || /ipad/i.test(userAgent)) device = 'Tablet';

    try {
        await supabaseAdmin.from('invite_clicks').insert({
            source: metadata.source,
            invite_id: metadata.invite_id,
            assignment_id: metadata.assignment_id,
            ip_address: ip,
            user_agent: userAgent,
            country: country,
            city: city,
            device: device,
            referrer: referer,
            clicked_at: new Date().toISOString()
        });
    } catch (e) {
        console.error("Failed to log analytics:", e);
    }
}
