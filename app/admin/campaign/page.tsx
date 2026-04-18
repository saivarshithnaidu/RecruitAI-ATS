import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ROLES } from "@/lib/roles";
import { getCampaignStats } from "@/app/actions/campaign";
import CampaignClient from "./CampaignClient";

/**
 * RecruitAI Candidate Outreach Dashboard
 */
export default async function AdminCampaignPage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || (session.user as any).role !== ROLES.ADMIN) {
        redirect("/auth/login");
    }

    const stats = await getCampaignStats();

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Candidate Outreach</h1>
                    <p className="text-gray-500 mt-1">Automated daily invites and campaign tracking.</p>
                </div>
                <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                    </span>
                    <span className="text-sm font-bold text-blue-700">Automation Active (50/day)</span>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Uploads</p>
                    <p className="text-3xl font-black text-gray-900">{stats.total || 0}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Pending Emails</p>
                    <p className="text-3xl font-black text-blue-600">{stats.pending || 0}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-xs font-bold text-green-400 uppercase tracking-widest mb-1">Sent Invites</p>
                    <p className="text-3xl font-black text-green-600">{stats.sent || 0}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-1">Sending Failed</p>
                    <p className="text-3xl font-black text-red-600">{stats.failed || 0}</p>
                </div>
            </div>

            <CampaignClient />
        </div>
    );
}
