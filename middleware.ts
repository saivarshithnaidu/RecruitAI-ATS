import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
    async function middleware(req) {
        const host = req.headers.get("host") || "";
        const { pathname } = req.nextUrl;
        const searchParams = req.nextUrl.search;

        const hostname = host.split(":")[0].toLowerCase();
        const MAIN_DOMAIN = "recruitaitech.in";
        const isDev = hostname.includes("localhost") || hostname.includes("127.0.0.1") || hostname.includes("vercel.app");
        
        // 0. WWW REDIRECT (Force non-www)
        if (!isDev && hostname.startsWith("www.")) {
            const newHost = hostname.replace("www.", "");
            return NextResponse.redirect(new URL(`https://${newHost}${pathname}${searchParams}`, req.url), 301);
        }

        // 1. Determine Subdomain
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

        // 2. TOKEN & PROTECTION
        // @ts-ignore
        const token = req.nextauth.token;
        const role = token?.role;

        // --- 3. ENFORCEMENT & REDIRECTS ---
        
        // A. Always serve AUTH on MAIN domain
        if (subdomain && !isDev && (pathname.startsWith("/auth") || pathname.startsWith("/api/auth"))) {
            return NextResponse.redirect(new URL(`https://${MAIN_DOMAIN}${pathname}${searchParams}`, req.url));
        }

        // B. CROSS-MODULE REDIRECTS (Force correct subdomain for module paths)
        if (!isDev) {
            // If someone hits /admin/* on ANY domain that is NOT admin.domain, redirect to admin subdomain
            if (pathname.startsWith("/admin") && subdomain !== "admin") {
                const targetPath = pathname.replace("/admin", "") || "/";
                return NextResponse.redirect(new URL(`https://admin.${MAIN_DOMAIN}${targetPath}${searchParams}`, req.url));
            }
            // If someone hits /candidate/* on ANY domain that is NOT candidate.domain, redirect to candidate subdomain
            if (pathname.startsWith("/candidate") && subdomain !== "candidate") {
                const targetPath = pathname.replace("/candidate", "") || "/";
                return NextResponse.redirect(new URL(`https://candidate.${MAIN_DOMAIN}${targetPath}${searchParams}`, req.url));
            }
            // If someone hits /apply/* on ANY domain that is NOT apply.domain, redirect to apply subdomain
            if (pathname.startsWith("/apply") && subdomain !== "apply") {
                const targetPath = pathname.replace("/apply", "") || "/";
                return NextResponse.redirect(new URL(`https://apply.${MAIN_DOMAIN}${targetPath}${searchParams}`, req.url));
            }
        }

        // C. ROLE ACCESS PROTECTION (Strict)
        if (subdomain === "admin" || pathname.startsWith("/admin")) {
            if (token && role !== "ADMIN") {
                return NextResponse.redirect(new URL(`https://candidate.${MAIN_DOMAIN}/dashboard`, req.url));
            }
        }
        if (subdomain === "candidate" || pathname.startsWith("/candidate")) {
             if (token && role !== "CANDIDATE" && role !== "ADMIN") {
                  return NextResponse.redirect(new URL(`https://${MAIN_DOMAIN}/auth/login`, req.url));
             }
        }

        // --- 4. REWRITES (Subdomain -> Internal Folder) ---
        let response = NextResponse.next();

        if (subdomain === "admin") {
            // Strip '/admin' if it exists in the internal flow to avoid double prefixing
            if (!pathname.startsWith("/admin") && !pathname.startsWith("/api")) {
                 response = NextResponse.rewrite(new URL(`/admin${pathname === "/" ? "/dashboard" : pathname}${searchParams}`, req.url));
            }
        } else if (subdomain === "candidate") {
            if (!pathname.startsWith("/candidate") && !pathname.startsWith("/api")) {
                 response = NextResponse.rewrite(new URL(`/candidate${pathname === "/" ? "/dashboard" : pathname}${searchParams}`, req.url));
            }
        } else if (subdomain === "apply") {
            if (!pathname.startsWith("/apply") && !pathname.startsWith("/api")) {
                 response = NextResponse.rewrite(new URL(`/apply${pathname}${searchParams}`, req.url));
            }
        } else if (subdomain === "interview") {
            if (!pathname.startsWith("/candidate/interviews") && !pathname.startsWith("/api")) {
                 response = NextResponse.rewrite(new URL(`/candidate/interviews${pathname}${searchParams}`, req.url));
            }
        }

        // SEO control
        if (subdomain === "admin") {
            response.headers.set("X-Robots-Tag", "noindex, nofollow");
        } else {
            response.headers.set("X-Robots-Tag", "index, follow");
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

                // Public Routes list
                const isPublic = 
                    subdomain === "apply" ||
                    subdomain === "interview" ||
                    pathname === "/" ||
                    pathname.startsWith("/auth") ||
                    pathname.startsWith("/api/auth") ||
                    pathname.startsWith("/features") ||
                    pathname.startsWith("/privacy-policy") ||
                    pathname.startsWith("/terms-conditions") ||
                    pathname.startsWith("/api/seb/config") ||
                    pathname === "/candidate/exam/secure" ||
                    pathname === "/robots.txt" ||
                    pathname === "/sitemap.xml";

                if (isPublic) return true;
                return !!token;
            },
        },
    }
)

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|public).*)",
    ]
}
