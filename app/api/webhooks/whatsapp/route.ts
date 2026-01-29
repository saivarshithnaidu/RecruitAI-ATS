import { NextRequest, NextResponse } from 'next/server';

const VERIFY_TOKEN = 'recruitai_whatsapp_verify';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            if (!challenge) {
                return new NextResponse(null, { status: 400 });
            }
            console.log('WEBHOOK_VERIFIED');
            return new Response(challenge, {
                status: 200,
                headers: { 'Content-Type': 'text/plain' }
            });
        } else {
            return new Response('Forbidden', { status: 403, headers: { 'Content-Type': 'text/plain' } });
        }
    }

    return new NextResponse(null, { status: 400 });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log('Received webhook event:', JSON.stringify(body, null, 2));

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error('Error processing webhook:', error);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
