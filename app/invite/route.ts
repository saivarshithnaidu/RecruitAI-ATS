import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { redirect } from 'next/navigation';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    // 1. Basic Validation
    if (!token) {
        return redirect('/');
    }

    // 2. Capture Metadata
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'Unknown';
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const referrer = request.headers.get('referer') || 'Direct';

    // Simple check to distinguish mobile/desktop based on UA (very basic)
    const isMobile = /mobile|android|iphone|ipad|ipod/i.test(userAgent);
    const device = isMobile ? 'Mobile' : 'Desktop';

    // 3. Geo Lookup (Server-side)
    // Using a free public API for demonstration. For high-scale, use a paid service or DB.
    let geoData = {
        country: 'Unknown',
        region: 'Unknown',
        city: 'Unknown',
        org: 'Unknown'
    };

    try {
        if (ip !== 'Unknown' && ip !== '127.0.0.1' && ip !== '::1') {
            const geoRes = await fetch(`https://ipapi.co/${ip}/json/`);
            if (geoRes.ok) {
                const data = await geoRes.json();
                geoData = {
                    country: data.country_name || 'Unknown',
                    region: data.region || 'Unknown',
                    city: data.city || 'Unknown',
                    org: data.org || 'Unknown'
                };
            }
        }
    } catch (err) {
        console.error('Geo lookup failed:', err);
    }

    // 4. Log to Database (Fire and forget - don't block redirect too long)
    // We use supabaseAdmin to bypass RLS
    try {
        await supabaseAdmin.from('invite_clicks').insert({
            invite_token: token,
            ip_address: ip,
            country: geoData.country,
            region: geoData.region,
            city: geoData.city,
            isp: geoData.org,
            device: device,
            browser: userAgent, // Storing full UA for now, could parse simply later
            referrer: referrer,
            clicked_at: new Date().toISOString()
        });
    } catch (dbErr) {
        console.error('Failed to log invite click:', dbErr);
        // Proceed anyway, don't fail the user flow
    }

    // 5. Redirect to Signup
    return redirect(`/auth/signup?source=invite`);
}
