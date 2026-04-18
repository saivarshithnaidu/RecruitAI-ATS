import { NextRequest, NextResponse } from "next/server";
import { generateSebConfig, verifyExamToken } from "@/lib/seb";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
        return new NextResponse("Token required", { status: 400 });
    }

    const payload = verifyExamToken(token);
    if (!payload) {
        return new NextResponse("Invalid or expired token", { status: 401 });
    }

    // Determine the start URL for the exam
    // In production, this should be the absolute URL to the exam page with the token
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://recruitaitech.in";
    const startUrl = `${baseUrl}/candidate/exam/secure?token=${token}`;

    const sebConfig = generateSebConfig(startUrl);

    return new NextResponse(sebConfig, {
        headers: {
            "Content-Type": "application/seb",
            "Content-Disposition": `attachment; filename="RecruitAI-Exam-${payload.assignmentId}.seb"`,
        },
    });
}
