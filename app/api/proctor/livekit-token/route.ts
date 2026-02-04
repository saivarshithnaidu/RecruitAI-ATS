import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ROLES } from '@/lib/roles';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { roomName, participantName, role } = body;

        if (!roomName || !participantName) {
            return NextResponse.json({ error: 'Missing roomName or participantName' }, { status: 400 });
        }

        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;
        const wsUrl = process.env.LIVEKIT_URL;

        if (!apiKey || !apiSecret || !wsUrl) {
            return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
        }

        const at = new AccessToken(apiKey, apiSecret, {
            identity: participantName,
        });

        const isAdmin = session.user.role === ROLES.ADMIN;
        // Verify user permission to join room? 
        // For strictness we should check if roomName matches their assignmentId or if they are admin.
        // Assuming roomName is passed as `exam-<assignmentId>`

        at.addGrant({
            roomJoin: true,
            room: roomName,
            canPublish: role === 'publisher', // Candidates publish
            canSubscribe: true, // Everyone subscribes
            canPublishData: true,
        });

        const token = at.toJwt();

        return NextResponse.json({ token });
    } catch (error) {
        console.error('Token generation error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
