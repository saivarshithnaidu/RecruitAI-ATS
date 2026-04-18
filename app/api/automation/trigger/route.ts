import { NextRequest, NextResponse } from "next/server";
import { AutomationTasks } from "@/lib/automation";

/**
 * RecruitAI Automation Webhook
 * Triggered by n8n or outside systems.
 */
export async function POST(req: NextRequest) {
    const authHeader = req.headers.get("authorization");
    
    // Simple secret for security
    const secret = process.env.AUTOMATION_SECRET || "recruitai_automation_2026";
    if (authHeader !== `Bearer ${secret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { action } = body;

        console.log(`[Automation Trigger] Received Action: ${action}`);

        let res = { success: false, message: "Unknown action" };

        if (action === 'MISSED_EXAMS') {
            const data = await AutomationTasks.processMissedExams();
            res = { success: data.success || false, message: `Processed ${data.processed || 0} missed exams.` };
        } else if (action === 'EXAM_REMINDERS') {
            const data = await AutomationTasks.sendExamReminders();
            res = { success: data.success || false, message: `Sent ${data.sent || 0} exam reminders.` };
        }

        return NextResponse.json(res);

    } catch (e: any) {
        console.error("Automation Trigger Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
