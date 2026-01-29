
import { NextResponse } from "next/server";
import { verifyMobileToken } from "@/lib/proctor-token";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const payload = verifyMobileToken(body.token);

        if (!payload) {
            return NextResponse.json({ success: false, error: "Invalid or Expired Token" }, { status: 401 });
        }

        return NextResponse.json({ success: true, examId: payload.examId, userId: payload.userId });
    } catch (e) {
        return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 });
    }
}
