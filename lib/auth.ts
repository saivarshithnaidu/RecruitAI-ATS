import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
// import { createClient } from "@supabase/supabase-js"; // Unused now
import { ROLES, ALLOWED_ADMINS } from "@/lib/roles";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
    session: {
        strategy: "jwt",
    },
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
            async profile(profile) {
                // Strict Role Assignment based on Email (Case Insensitive)
                const email = profile.email?.toLowerCase();
                const isAdmin = ALLOWED_ADMINS.includes(email);
                const role = isAdmin ? ROLES.ADMIN : ROLES.CANDIDATE;

                return {
                    id: profile.sub,
                    name: profile.name,
                    email: profile.email,
                    image: profile.picture,
                    role: role,
                }
            }
        }),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null

                // 2. FIX EMAIL CASE & TRIMMING
                const email = credentials.email.trim().toLowerCase();
                const password = credentials.password.trim();

                console.log(`[Auth] Attempting login for: ${email}`);

                try {
                    // 1. MANUAL AUTH VIA PROFILES TABLE
                    // Use ilike for case-insensitive match to prevent "Invalid credentials" due to casing
                    const { data: profile, error } = await supabaseAdmin
                        .from('profiles')
                        .select('*')
                        .ilike('email', email)
                        .single();

                    if (error || !profile) {
                        console.error("[Auth] User not found in profiles (ilike):", email, error?.message);
                        return null;
                    }

                    // 2. CHECK PASSWORD
                    if (!profile.password_hash) {
                        console.error("[Auth] No password hash for user:", email);
                        return null;
                    }

                    const isValid = await bcrypt.compare(password, profile.password_hash);

                    if (!isValid) {
                        console.error(`[Auth] Invalid password for: ${email}`);
                        // Debugging: Don't log real passwords, but maybe log hash length or existence
                        // console.log(`[Auth] Hash in DB: ${profile.password_hash.substring(0, 10)}... (Length: ${profile.password_hash.length})`); 
                        return null;
                    }

                    // 3. Strict Role Assignment
                    const isAdmin = ALLOWED_ADMINS.includes(email);
                    const userRole = isAdmin ? ROLES.ADMIN : ROLES.CANDIDATE;

                    console.log(`[Auth] Login Success for ${email}. Role: ${userRole}`);

                    return {
                        id: profile.id, // User ID
                        name: profile.full_name || email.split('@')[0],
                        email: profile.email,
                        role: userRole,
                        image: null
                    }
                } catch (error: any) {
                    console.error("[Auth] Authorization Error:", error.message);
                    if (error.message === "Invalid credentials") {
                        throw new Error("Invalid credentials");
                    }
                    return null;
                }
            }
        })
    ],
    // ... callbacks

    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                console.log(`[Auth] JWT Callback: User ${user.email} has role ${user.role}`);
                token.sub = user.id
                // @ts-ignore
                token.role = user.role
            }
            if (trigger === "update" && session?.user) {
                // @ts-ignore
                token.role = session.user.role
            }
            return token
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.sub as string
                // @ts-ignore
                session.user.role = token.role
            }
            return session
        }
    },
    pages: {
        signIn: '/auth/login',
        error: '/auth/error', // Error code passed in query string as ?error=
    }
}
