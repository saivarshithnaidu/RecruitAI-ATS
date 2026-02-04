import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({
        message: "Automation connection successful",
        timestamp: new Date().toISOString()
    });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        return NextResponse.json({ message: "Automation POST successful", received: body });
    } catch (e) {
        return NextResponse.json({ message: "Automation POST successful (no body)" });
    }
}
