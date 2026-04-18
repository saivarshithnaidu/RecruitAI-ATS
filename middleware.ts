import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

/**
 * RECRUITAI SUBDOMAIN MIDDLEWARE
 * Handles:
 * 1. Subdomain detection & Rewriting
 * 2. Authorization (RBAC)
 * 3. SEO (noindex for private modules)
 * 4. Cross-domain session handling
 */

export default withAuth(
    async function middleware(req) {
        const host = req.headers.get("host") || "";
        const { pathname } = req.nextUrl;
        const url = req.nextUrl.clone();

        // @ts-ignore
        const token = req.nextauth.token;
        const role = token?.role;

        // --- 1. SUBDOMAIN DETECTION ---
        const hostname = host.split(":")[0];
        const isDev = hostname.includes("localhost") || hostname.includes("127.0.0.1") || hostname.includes("vercel.app");
        
        let subdomain = "";
        if (!isDev) {
            if (hostname.endsWith("recruitaitech.in") && hostname !== "recruitaitech.in") {
                subdomain = hostname.replace(".recruitaitech.in", "");
            }
        } else {
            // Dev: allow simulating subdomains with [sub].localhost (requires etc/hosts edit or wildcard DNS)
            const parts = hostname.split(".");
            if (parts.length > 1) {
                subdomain = parts[0];
            }
        }

        // --- 2. REWRITE RULES ---
        let response = NextResponse.next();

        if (subdomain === "admin") {
            // Prevent recursive rewrites
            if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/admin")) {
                response = NextResponse.rewrite(new URL(`/admin${pathname}`, req.url));
            }
        } else if (subdomain === "candidate") {
            if (!pathname.startsWith("/candidate") && !pathname.startsWith("/api/candidate")) {
                response = NextResponse.rewrite(new URL(`/candidate${pathname}`, req.url));
            }
        } else if (subdomain === "apply") {
            if (!pathname.startsWith("/apply")) {
                response = NextResponse.rewrite(new URL(`/apply${pathname}`, req.url));
            }
        } else if (subdomain === "interview") {
            if (!pathname.startsWith("/candidate/interview")) {
                response = NextResponse.rewrite(new URL(`/candidate/interview${pathname}`, req.url));
            }
        }

        // --- 2.5. SUBDOMAIN ENFORCEMENT ---
        // If on main domain but visiting a path that should be on a subdomain -> Redirect to Subdomain
        if (!subdomain && !isDev) {
            if (pathname.startsWith("/admin")) {
                return NextResponse.redirect(new URL(`https://admin.recruitaitech.in${pathname.replace("/admin", "") || "/"}`, req.url));
            }
            if (pathname.startsWith("/candidate")) {
                return NextResponse.redirect(new URL(`https://candidate.recruitaitech.in${pathname.replace("/candidate", "") || "/"}`, req.url));
            }
            if (pathname.startsWith("/apply")) {
                return NextResponse.redirect(new URL(`https://apply.recruitaitech.in${pathname.replace("/apply", "") || "/"}`, req.url));
            }
        }

        // --- 3. MODULE-SPECIFIC AUTHORIZATION ---
        // These checks run AFTER mapping
        
        // Admin Module Protection
        if (subdomain === "admin" || pathname.startsWith("/admin")) {
            if (role !== "ADMIN") {
                return NextResponse.redirect(new URL(role === "CANDIDATE" ? "https://candidate.recruitaitech.in" : "https://recruitaitech.in/auth/login", req.url));
            }
        }

        // Candidate Module Protection
        if (subdomain === "candidate" || pathname.startsWith("/candidate")) {
            if (role !== "CANDIDATE" && role !== "ADMIN") {
                 return NextResponse.redirect(new URL("https://recruitaitech.in/auth/login", req.url));
            }
        }

        // --- 4. SEO RULES (X-Robots-Tag) ---
        if (["admin", "candidate", "interview"].includes(subdomain)) {
            response.headers.set("X-Robots-Tag", "noindex, nofollow");
        }

        return response;
    },
    {
        callbacks: {
            authorized: ({ req, token }) => {
                const host = req.headers.get("host") || "";
                const pathname = req.nextUrl.pathname;
                
                // Extract subdomain for authorization check
                const hostname = host.split(":")[0];
                let subdomain = "";
                if (hostname.endsWith("recruitaitech.in") && hostname !== "recruitaitech.in") {
                    subdomain = hostname.replace(".recruitaitech.in", "");
                }

                // Public Routes
                if (
                    subdomain === "apply" ||
                    pathname === "/" ||
                    pathname === "/api/seb/config" ||
                    pathname === "/candidate/exam/secure" ||
                    (pathname === "/candidate/exam" && req.nextUrl.searchParams.has("token")) ||
                    pathname.startsWith("/apply") ||
                    pathname.startsWith("/features") ||
                    pathname.startsWith("/privacy-policy") ||
                    pathname.startsWith("/terms-and-conditions") ||
                    pathname.startsWith("/auth") ||
                    pathname.startsWith("/api/auth") ||
                    pathname.startsWith("/api/webhooks") ||
                    pathname.endsWith(".html") ||
                    pathname === "/robots.txt" ||
                    pathname === "/sitemap.xml"
                ) {
                    return true;
                }

                return !!token;
            },
        },
    }
)

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public (public folder)
         */
        "/((?!_next/static|_next/image|favicon.ico|public).*)",
    ]
}
