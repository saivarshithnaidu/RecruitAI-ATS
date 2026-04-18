import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ROLES } from "@/lib/roles";
import AdminNavbar from "@/app/components/AdminNavbar";
import Providers from "@/app/components/Providers";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/auth/login");
    }

    // Strict Role Check: Admins ONLY
    // @ts-ignore
    if (session.user?.role !== ROLES.ADMIN) {
        redirect("/candidate/application");
    }

    return (
        <Providers session={session}>
            <div className="flex flex-col min-h-screen bg-gray-100">
                <AdminNavbar />
                <main className="flex-grow">
                    {children}
                </main>
            </div>
        </Providers>
    );
}
