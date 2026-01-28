
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ROLES } from "@/lib/roles";

export default async function DashboardRouter() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        redirect("/auth/login");
    }

    // @ts-ignore
    const role = session.user.role;

    if (role === ROLES.ADMIN) {
        redirect("/admin/dashboard");
    } else if (role === ROLES.CANDIDATE) {
        redirect("/candidate/application");
    } else {
        // Fallback for unknown roles
        redirect("/");
    }
}
