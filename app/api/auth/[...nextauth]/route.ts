import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

console.log("[NextAuth] Configuring handler...");
console.log(`[NextAuth] NEXTAUTH_URL: ${process.env.NEXTAUTH_URL}`);
console.log(`[NextAuth] NEXTAUTH_SECRET set: ${!!process.env.NEXTAUTH_SECRET}`);

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
