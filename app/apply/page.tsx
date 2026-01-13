import ApplicationForm from '@/components/ApplicationForm';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { ROLES } from '@/lib/roles';

export default async function ApplyPage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        redirect("/auth/login?callbackUrl=/apply");
    }

    // @ts-ignore
    if (session.user.role === ROLES.ADMIN) {
        redirect("/admin/dashboard");
    }

    // Check if candidate has an ACTIVE application
    const { data: latestApp } = await supabaseAdmin
        .from('applications')
        .select('status')
        .eq('user_id', session.user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    // Terminal states that allow re-application
    const terminalStatuses = ['WITHDRAWN', 'REJECTED', 'EXAM_FAILED', 'DELETED', 'HIRED'];

    if (latestApp && !terminalStatuses.includes(latestApp.status)) {
        redirect("/candidate/application");
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-8">
                <h1 className="text-3xl font-extrabold text-gray-900">Join our Team</h1>
                <p className="mt-4 text-lg text-gray-600">
                    We are looking for talented individuals to join our growing team. Apply below!
                </p>
            </div>
            <ApplicationForm />
        </div>
    );
}
