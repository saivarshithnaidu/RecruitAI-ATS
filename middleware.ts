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

        // --- 1. HOST & SUBDOMAIN DETECTION ---
        const hostname = host.split(":")[0].toLowerCase();
        const MAIN_DOMAIN = "recruitaitech.in";
        const isDev = hostname.includes("localhost") || hostname.includes("127.0.0.1") || hostname.includes("vercel.app");
        
        // Extract subdomain: [sub].recruitaitech.in or [sub].localhost
        let subdomain = "";
        if (!isDev) {
            if (hostname.endsWith(MAIN_DOMAIN) && hostname !== MAIN_DOMAIN && hostname !== `www.${MAIN_DOMAIN}`) {
                subdomain = hostname.replace(`.${MAIN_DOMAIN}`, "");
            }
        } else {
            const parts = hostname.split(".");
            if (parts.length > 1 && parts[0] !== "www") {
                subdomain = parts[0];
            }
        }

        // --- 2. ENFORCEMENT REDIRECTS (Main Domain -> Subdomain & Auth -> Main Domain) ---
        // A. If on a SUBDOMAIN and visiting /auth path -> Redirect to MAIN DOMAIN (to fix Google OAuth mismatch)
        if (subdomain && !isDev && (pathname.startsWith("/auth/login") || pathname.startsWith("/auth/signup"))) {
            return NextResponse.redirect(new URL(`https://${MAIN_DOMAIN}${pathname}${req.nextUrl.search}`, req.url));
        }

        // B. If we are on the main domain (recruitaitech.in or www.recruitaitech.in),
        // we redirect module paths to their respective subdomains.
        if (!subdomain && !isDev) {
            if (pathname.startsWith("/admin")) {
                const target = pathname.replace("/admin", "") || "/";
                return NextResponse.redirect(new URL(`https://admin.${MAIN_DOMAIN}${target}`, req.url));
            }
            if (pathname.startsWith("/candidate")) {
                const target = pathname.replace("/candidate", "") || "/";
                return NextResponse.redirect(new URL(`https://candidate.${MAIN_DOMAIN}${target}`, req.url));
            }
            if (pathname.startsWith("/apply")) {
                const target = pathname.replace("/apply", "") || "/";
                return NextResponse.redirect(new URL(`https://apply.${MAIN_DOMAIN}${target}`, req.url));
            }
        }

        // --- 3. SUBDOMAIN REWRITES (Subdomain -> Internal Path) ---
        let response = NextResponse.next();

        if (subdomain === "admin") {
            // Map admin.domain.com/dashboard to /admin/dashboard
            // EXCLUDE shared routes like /auth, /api/auth
            if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/admin") && !pathname.startsWith("/auth") && !pathname.startsWith("/api/auth")) {
                response = NextResponse.rewrite(new URL(`/admin${pathname === "/" ? "/dashboard" : pathname}`, req.url));
            }
        } else if (subdomain === "candidate") {
            // Map candidate.domain.com/dashboard to /candidate/dashboard
            if (!pathname.startsWith("/candidate") && !pathname.startsWith("/api/candidate") && !pathname.startsWith("/auth") && !pathname.startsWith("/api/auth")) {
                response = NextResponse.rewrite(new URL(`/candidate${pathname === "/" ? "/dashboard" : pathname}`, req.url));
            }
        } else if (subdomain === "apply") {
            // Map apply.domain.com/ to /apply/
            if (!pathname.startsWith("/apply") && !pathname.startsWith("/auth") && !pathname.startsWith("/api/auth")) {
                response = NextResponse.rewrite(new URL(`/apply${pathname}`, req.url));
            }
        } else if (subdomain === "interview") {
            // Map interview.domain.com/ to /candidate/interviews/
            if (!pathname.startsWith("/candidate/interview") && !pathname.startsWith("/auth") && !pathname.startsWith("/api/auth")) {
                const targetPath = pathname === "/" ? "/candidate/interviews" : `/candidate/interviews${pathname}`;
                response = NextResponse.rewrite(new URL(targetPath, req.url));
            }
        }

        // --- 3. MODULE-SPECIFIC AUTHORIZATION ---
        // These checks run AFTER mapping
        
        // --- 3. MODULE-SPECIFIC AUTHORIZATION ---
        // These checks run AFTER mapping
        
        // Admin Module Protection
        if (subdomain === "admin" || pathname.startsWith("/admin")) {
            if (token && role !== "ADMIN") {
                return NextResponse.redirect(new URL("https://candidate.recruitaitech.in/dashboard", req.url));
            }
        }

        // Candidate Module Protection
        if (subdomain === "candidate" || pathname.startsWith("/candidate")) {
             if (token && role !== "CANDIDATE" && role !== "ADMIN") {
                  return NextResponse.redirect(new URL("https://admin.recruitaitech.in/dashboard", req.url));
             }
        }

        // --- 4. SEO RULES (X-Robots-Tag) ---
        if (["admin", "candidate", "interview"].includes(subdomain)) {
            response.headers.set("X-Robots-Tag", "noindex, nofollow");
        }

        return response;
    },
    {
        secret: process.env.NEXTAUTH_SECRET,
        cookies: {
            sessionToken: {
                name: process.env.NODE_ENV === 'production' ? `__Secure-next-auth.session-token` : `next-auth.session-token`,
            }
        },
        callbacks: {
            authorized: ({ req, token }) => {
                const host = req.headers.get("host") || "";
                const pathname = req.nextUrl.pathname;
                const hostname = host.split(":")[0].toLowerCase();
                const MAIN_DOMAIN = "recruitaitech.in";

                let subdomain = "";
                if (hostname.endsWith(MAIN_DOMAIN) && hostname !== MAIN_DOMAIN && hostname !== `www.${MAIN_DOMAIN}`) {
                    subdomain = hostname.replace(`.${MAIN_DOMAIN}`, "");
                }

                // Root & Public Routes are always authorized (Middleware logic handles specific restrictions)
                if (
                    subdomain === "apply" ||
                    subdomain === "interview" ||
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
