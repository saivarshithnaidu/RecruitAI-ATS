import { NextRequest, NextResponse } from "next/server";
import { generateAtsScore } from "@/app/actions/ats";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    try {
        // Trigger the robust ATS generation logic
        // This will use the new HF Parser -> local pdf-parse fallback chain
        const result = await generateAtsScore(id);

        if (result.success) {
            return NextResponse.json({ success: true, message: "Analysis complete", score: result.score });
        } else {
            return NextResponse.json({ success: false, message: result.error || "Analysis failed" }, { status: 500 });
        }
    } catch (error: any) {
        console.error("[API] ATS Analysis Error:", error.message);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
