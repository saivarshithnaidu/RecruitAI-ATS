
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ROLES, ALLOWED_ADMINS } from "@/lib/roles";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // 1. Fetch user from profiles
        const { data: profile, error } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .ilike('email', normalizedEmail)
            .single();

        if (error || !profile) {
            return NextResponse.json({ error: "User not found" }, { status: 401 });
        }

        // 2. Verify Password
        if (!profile.password_hash) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        const isValid = await bcrypt.compare(password, profile.password_hash);
        if (!isValid) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        // 3. Check Role
        const isAdmin = ALLOWED_ADMINS.includes(normalizedEmail);
        const role = isAdmin ? ROLES.ADMIN : ROLES.CANDIDATE;

        if (role !== ROLES.ADMIN) {
            return NextResponse.json({ error: "Forbidden: Admin access only" }, { status: 403 });
        }

        // 4. Generate JWT
        const secret = process.env.NEXTAUTH_SECRET;
        if (!secret) {
            console.error("NEXTAUTH_SECRET is missing");
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
        }

        const token = jwt.sign(
            {
                sub: profile.id,
                email: profile.email,
                role: role,
                name: profile.full_name
            },
            secret,
            { expiresIn: "10h" } // Long expiry for convenience during testing
        );

        return NextResponse.json({
            success: true,
            token,
            user: {
                id: profile.id,
                email: profile.email,
                role
            }
        });

    } catch (error: any) {
        console.error("Token Login Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
