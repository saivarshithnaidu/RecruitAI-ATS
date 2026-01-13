import nodemailer from 'nodemailer';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
    console.log('Testing SMTP Configuration...');

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT || "587";

    // Logic from lib/email.ts
    const smtpUserRaw = process.env.SMTP_USER;
    const emailFromRaw = process.env.EMAIL_FROM;

    const extractEmail = (str) => {
        if (!str) return undefined;
        if (str.includes('<')) {
            const match = str.match(/<(.+)>/);
            return match ? match[1] : str;
        }
        return str;
    };

    const smtpUser = extractEmail(smtpUserRaw) || extractEmail(emailFromRaw);
    const smtpPass = process.env.SMTP_PASS;

    console.log(`Host: ${smtpHost}`);
    console.log(`Port: ${smtpPort}`);
    // Hide actual user email for privacy in logs if possible, but for debug we might need it. 
    // Just showing first few chars.
    console.log(`User: ${smtpUser}`);
    console.log(`Pass: ${smtpPass ? '******' : 'MISSING'}`);

    if (!smtpHost || !smtpUser || !smtpPass) {
        console.error('Missing required SMTP configuration.');
        return;
    }

    const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort),
        secure: false, // true for 465, false for other ports
        auth: {
            user: smtpUser,
            pass: smtpPass,
        },
    });

    try {
        console.log('Verifying connection...');
        await transporter.verify();
        console.log('SMTP Connection Verified Successfully.');

        // Try sending an email to self (the sender)
        console.log(`Attempting to send test email to ${smtpUser}...`);
        const info = await transporter.sendMail({
            from: `"${process.env.EMAIL_FROM_NAME || 'RecruitAI Test'}" <${process.env.EMAIL_FROM}>`,
            to: smtpUser, // Send to self
            subject: "RecruitAI SMTP Test",
            text: "This is a test email to verify SMTP configuration.",
        });
        console.log("Message sent: %s", info.messageId);

    } catch (error) {
        console.error('SMTP Error:', error);
    }
}

main();
