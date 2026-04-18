import UnifiedApplicationForm from '@/components/UnifiedApplicationForm';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { ROLES } from '@/lib/roles';
import { getProfile } from '@/app/actions/profile';

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Apply for Jobs | RecruitAI – AI Hiring Platform",
  description: "Join the future of recruitment. Apply for job openings at RecruitAI Tech and showcase your skills through our AI-driven assessment platform.",
  alternates: {
    canonical: "https://recruitaitech.in/apply",
  },
};

export default async function ApplyPage() {
    const session = await getServerSession(authOptions);

    // REMOVED: Mandating login. Page is now public for guest viewing as per SEO Req.
    // However, submission will still require a session or handle guest logic.

    // @ts-ignore
    if (session && session.user?.role === ROLES.ADMIN) {
        redirect("/admin/dashboard");
    }

    let latestApp = null;
    if (session?.user?.id) {
        // Check if candidate has an ACTIVE application
        const { data } = await supabaseAdmin
            .from('applications')
            .select('status')
            .eq('user_id', session.user.id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        latestApp = data;
    }

    // Terminal states that allow re-application
    const terminalStatuses = ['WITHDRAWN', 'REJECTED', 'EXAM_FAILED', 'DELETED', 'HIRED'];

    if (latestApp && !terminalStatuses.includes(latestApp.status)) {
        redirect("/candidate/dashboard");
    }

    // Fetch existing profile to pre-fill
    const profile = await getProfile();

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center mb-8">
                <h1 className="text-3xl font-extrabold text-gray-900">Join our Team</h1>
                <p className="mt-4 text-lg text-gray-600">
                    Complete your profile and apply in one step.
                </p>
            </div>
            <UnifiedApplicationForm initialProfile={profile} />
        </div>
    );
}
