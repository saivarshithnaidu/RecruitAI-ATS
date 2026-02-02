
import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

const FROM_NAME = process.env.MAIL_FROM_NAME || 'RecruitAI';
const FROM_EMAIL = process.env.MAIL_FROM_EMAIL || 'support@recruitai.in';
const EMAIL_FROM = `"${FROM_NAME}" <${FROM_EMAIL}>`;

// Create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // true for 465, false for other ports
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
    },
});

export async function sendStatusUpdateEmail(to: string, name: string, status: 'HIRED' | 'REJECTED') {
    const isConfigured = SMTP_USER && SMTP_PASS;

    if (!isConfigured) {
        console.log(`[MOCK EMAIL] To: ${to}, Status: ${status}`);
        console.log(`[MOCK EMAIL] Body: Dear ${name}, your status is now ${status}.`);
        return true;
    }

    try {
        const subject = status === 'HIRED'
            ? 'Congratulations! You have been Hired'
            : 'Update on your Application at RecruitAI';

        const html = status === 'HIRED'
            ? `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h2>Congratulations, ${name}!</h2>
                    <p>We are thrilled to inform you that you have been <strong>HIRED</strong> for the position!</p>
                    <p>Our HR team will reach out to you shortly with the offer letter and onboarding details.</p>
                    <p>Welcome to the team!</p>
                    <br/>
                    <p>Best regards,<br/>RecruitAI Team</p>
                </div>
            `
            : `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h2>Application Update</h2>
                    <p>Dear ${name},</p>
                    <p>Thank you for your interest in joining our company. After careful consideration, we regret to inform you that we will not be moving forward with your application at this time.</p>
                    <p>We wish you the best in your future endeavors.</p>
                    <br/>
                    <p>Best regards,<br/>RecruitAI Team</p>
                </div>
            `;

        const info = await transporter.sendMail({
            from: EMAIL_FROM,
            to,
            subject,
            html,
        });

        console.log("Message sent: %s", info.messageId);
        return true;
    } catch (error) {
        console.error("Error sending email:", error);
        // Don't fail the request if email fails, just log it
        return false;
    }
}

export async function sendVerificationEmail(to: string, otp: string) {
    const isConfigured = SMTP_USER && SMTP_PASS;

    if (!isConfigured) {
        console.log(`[MOCK OTP] To: ${to}, OTP: ${otp}`);
        return true;
    }

    try {
        const info = await transporter.sendMail({
            from: EMAIL_FROM,
            to,
            subject: 'Verify your Phone Number - RecruitAI',
            html: `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h2>Phone Verification</h2>
                    <p>Use the following OTP to verify your phone number:</p>
                    <h1 style="color: #2563eb; letter-spacing: 5px;">${otp}</h1>
                    <p>This code is valid for 10 minutes.</p>
                </div>
            `,
        });
        console.log("OTP Sent: %s", info.messageId);
        return true;
    } catch (error) {
        console.error("Error sending OTP:", error);
        return false;
    }
}
