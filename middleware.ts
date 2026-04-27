import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
    const host = req.headers.get("host") || "";
    const { pathname } = req.nextUrl;
    const searchParams = req.nextUrl.search;
    const hostname = host.split(":")[0].toLowerCase();
    const MAIN_DOMAIN = "recruitaitech.in";
    const isDev = hostname.includes("localhost") || hostname.includes("127.0.0.1") || hostname.includes("vercel.app");

    // 1. CANONICAL REDIRECT: www.recruitaitech.in -> recruitaitech.in
    if (!isDev && hostname === `www.${MAIN_DOMAIN}`) {
        return NextResponse.redirect(`https://${MAIN_DOMAIN}${pathname}${searchParams}`, 301);
    }

    // 2. GET AUTH TOKEN (Session check)
    const token = await getToken({ 
        req, 
        secret: process.env.NEXTAUTH_SECRET,
        secureCookie: process.env.NODE_ENV === 'production'
    });

    const isAuthPage = pathname.startsWith('/auth');
    const isApiAuth = pathname.startsWith('/api/auth');
    const isPublicPath = 
        pathname === "/" || 
        pathname.startsWith("/features") || 
        pathname.startsWith("/privacy-policy") || 
        pathname.startsWith("/terms-conditions") ||
        pathname.startsWith("/api/seb/config") ||
        pathname === "/candidate/exam/secure" ||
        pathname === "/robots.txt" ||
        pathname === "/sitemap.xml" ||
        pathname.startsWith("/_next") ||
        pathname.includes("."); // static files

    // 3. AUTH REDIRECT LOOP FIX
    // If not logged in and trying to access a protected page
    if (!token && !isAuthPage && !isApiAuth && !isPublicPath) {
        return NextResponse.redirect(new URL('/auth/login', req.url));
    }

    // If logged in and trying to access auth pages (login/register)
    if (token && isAuthPage) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // 4. SUBDOMAIN REWRITES (Internal logic, not redirects)
    let subdomain = "";
    if (!isDev) {
        if (hostname.endsWith(MAIN_DOMAIN) && hostname !== MAIN_DOMAIN) {
            subdomain = hostname.replace(`.${MAIN_DOMAIN}`, "");
        }
    } else {
        const parts = hostname.split(".");
        if (parts.length > 1 && parts[0] !== "www" && !hostname.includes("localhost")) {
            subdomain = parts[0];
        } else if (hostname.includes("localhost") && parts.length > 1) {
            subdomain = parts[0];
        }
    }

    let response = NextResponse.next();

    // Apply rewrites for subdomains to internal folders
    if (subdomain && !pathname.startsWith('/api') && !isPublicPath) {
        if (subdomain === "admin") {
            if (!pathname.startsWith("/admin")) {
                response = NextResponse.rewrite(new URL(`/admin${pathname === "/" ? "/dashboard" : pathname}${searchParams}`, req.url));
            }
        } else if (subdomain === "candidate") {
            if (!pathname.startsWith("/candidate")) {
                response = NextResponse.rewrite(new URL(`/candidate${pathname === "/" ? "/dashboard" : pathname}${searchParams}`, req.url));
            }
        } else if (subdomain === "apply") {
            if (!pathname.startsWith("/apply")) {
                response = NextResponse.rewrite(new URL(`/apply${pathname}${searchParams}`, req.url));
            }
        } else if (subdomain === "interview") {
            if (!pathname.startsWith("/candidate/interviews")) {
                response = NextResponse.rewrite(new URL(`/candidate/interviews${pathname}${searchParams}`, req.url));
            }
        }
    }

    // SEO control
    if (subdomain === "admin") {
        response.headers.set("X-Robots-Tag", "noindex, nofollow");
    } else {
        response.headers.set("X-Robots-Tag", "index, follow");
    }

    return response;
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|public).*)",
    ]
}
