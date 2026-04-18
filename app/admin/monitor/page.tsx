import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ROLES } from "@/lib/roles";
import { getActiveProctoringSessions } from "@/app/actions/proctoring";
import LiveMonitorClient from "./LiveMonitorClient";

/**
 * RecruitAI Live Assessment Monitor
 * 
 * Provides real-time visibility into active SEB assessment sessions.
 * Admins can track candidate presence, heartbeat, and proctoring violations.
 */
export default async function AdminMonitorPage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || (session.user as any).role !== ROLES.ADMIN) {
        redirect("/auth/login");
    }

    const { sessions, error } = await getActiveProctoringSessions();

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                        Live Assessment Monitor
                    </h1>
                    <p className="text-gray-500 mt-1">Real-time status of candidates in secure SEB sessions.</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
                    {error}
                </div>
            )}

            <LiveMonitorClient initialSessions={sessions || []} />
        </div>
    );
}
