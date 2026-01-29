"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { signMobileToken } from "@/lib/proctor-token";

export async function generateMobileConnectToken(examId: string) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        throw new Error("Unauthorized");
    }

    // Generate a secure token valid for 10 minutes
    const token = signMobileToken({
        examId: examId,
        userId: session.user.id
    });

    // Provide the full URL for the QR code
    // Assuming process.env.NEXT_PUBLIC_APP_URL is set, else fallback to origin in client or relative
    // To be safe, we return the relative path and let client construct active origin, or absolute if ENV available.
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    const url = `${baseUrl}/third-eye/connect?token=${token}`;

    return { token, url };
}
