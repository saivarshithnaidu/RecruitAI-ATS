import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
    function middleware(req) {
        // @ts-ignore
        const role = req.nextauth.token?.role
        const pathname = req.nextUrl.pathname

        // 1. Admin Protection
        if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
            if (role !== "ADMIN") {
                if (pathname.startsWith("/api")) {
                    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
                }
                return NextResponse.redirect(new URL(role === "CANDIDATE" ? "/candidate/application" : "/", req.url))
            }
        }

        // 2. Candidate Protection
        if (pathname.startsWith("/candidate") || pathname.startsWith("/api/candidate")) {
            if (role !== "CANDIDATE") {
                if (pathname.startsWith("/api")) {
                    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
                }
                return NextResponse.redirect(new URL(role === "ADMIN" ? "/admin/dashboard" : "/", req.url))
            }
        }

        // 3. Apply Route (Guests only ideally, or check duplicate)
        if (pathname.startsWith("/apply")) {
            if (role === "ADMIN") {
                return NextResponse.redirect(new URL("/admin/dashboard", req.url))
            }
            if (role === "CANDIDATE") {
                // Should check if already applied logic exists in page, but middleware can redirect generic Access
                // We let the page handle the "already applied" check for granular control, 
                // but generic candidates might just go to dashboard if they shouldn't apply again.
                // For now, allow access so page logic can redirect if applied, or show form if not?
                // User says: "If candidate already applied: Block /apply -> Redirect to /candidate/application"
                // Middleware doesn't know DB state. So we leave it to page level, OR we redirect all candidates to dashboard?
                // If we redirect all candidates, they can't apply! Wait. "Candidate can apply ONLY ONCE". 
                // If they haven't applied, they need /apply.
                // So middleware allows Candidates on /apply. 
            }
        }
    },
    {
        callbacks: {
            authorized: ({ req, token }) => {
                const pathname = req.nextUrl.pathname;

                // Public paths that don't require authentication
                if (
                    pathname === "/" ||
                    pathname.startsWith("/auth") ||
                    pathname.startsWith("/api/auth") // Should be excluded by matcher, but safe to add
                ) {
                    return true;
                }

                // Require authentication for all other routes
                return !!token;
            },
        },
    }
)

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api/auth (auth routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public (public folder)
         */
        "/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)",
    ]
}
