
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret-key-change-in-prod';

export function signMobileToken(payload: { examId: string; userId: string; sessionId?: string }) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '10m' }); // Short lived for initial connection
}

export function verifyMobileToken(token: string) {
    try {
        return jwt.verify(token, JWT_SECRET) as { examId: string; userId: string; sessionId?: string };
    } catch (e) {
        return null;
    }
}
