import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ROLES } from "@/lib/roles";
import CandidateNavbar from "@/app/components/CandidateNavbar";

export default async function CandidateLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/auth/login");
    }

    // Strict Role Check: Candidates ONLY
    // @ts-ignore
    if (session.user?.role === ROLES.ADMIN) {
        redirect("/admin/dashboard");
    }

    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            <CandidateNavbar />
            <main className="flex-grow">
                {children}
            </main>
        </div>
    );
}
