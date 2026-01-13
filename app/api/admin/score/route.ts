import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { scoreApplication } from "@/lib/ats";

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const allowedAdmins = ['admin1@example.com', 'admin2@example.com', 'recruitai@company.com'];
        // @ts-ignore
        const userEmail = session.user.email;
        // @ts-ignore
        const userRole = session.user.role;

        if (userRole !== ROLES.ADMIN && (!userEmail || !allowedAdmins.includes(userEmail))) {
            return NextResponse.json({ success: false, message: 'Forbidden: Admin only' }, { status: 403 });
        }

        const { applicationId } = await request.json();

        if (!applicationId) {
            return NextResponse.json({ success: false, message: 'Application ID is required' }, { status: 400 });
        }

        // Delegate to Shared Logic
        const result = await scoreApplication(applicationId);

        if (!result.success) {
            return NextResponse.json({ success: false, message: result.message || 'Scoring Failed' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data: { score: result.score, status: result.status }
        });

    } catch (globalError: any) {
        console.error("CRITICAL ROUTE ERROR:", globalError);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
