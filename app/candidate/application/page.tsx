import { redirect } from "next/navigation";

export default function ApplicationRedirect() {
    // Redirect to the new dashboard route
    redirect("/candidate/dashboard");
}
