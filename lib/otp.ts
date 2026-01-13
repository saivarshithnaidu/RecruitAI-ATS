import { createHash, randomBytes } from 'crypto';

export function generateOtp(): string {
    // Generate a secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    return otp;
}

export function hashOtp(otp: string): string {
    // Hash the OTP using SHA-256 for secure storage
    return createHash('sha256').update(otp).digest('hex');
}
