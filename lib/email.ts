import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: parseInt(process.env.SMTP_PORT || "587") === 465, // true for 465, false for other ports
    auth: {
        // Use SMTP_USER if it looks like an email, otherwise fallback to MAIL_FROM_EMAIL
        // Extract email if it's in "Name <email>" format
        user: (process.env.SMTP_USER?.includes('<') ? process.env.SMTP_USER.match(/<(.+)>/)?.[1] : process.env.SMTP_USER) ||
            (process.env.MAIL_FROM_EMAIL?.includes('<') ? process.env.MAIL_FROM_EMAIL.match(/<(.+)>/)?.[1] : process.env.MAIL_FROM_EMAIL),
        pass: process.env.SMTP_PASS,
    },
})

export async function sendEmail({
    to,
    subject,
    html,
}: {
    to: string
    subject: string
    html: string
}) {
    try {
        const fromName = process.env.MAIL_FROM_NAME || 'RecruitAI';
        const fromEmail = process.env.MAIL_FROM_EMAIL || 'support@recruitai.in';

        const info = await transporter.sendMail({
            from: `"${fromName}" <${fromEmail}>`,
            to,
            subject,
            html,
        })
        console.log("Message sent: %s", info.messageId)
        return { success: true, messageId: info.messageId }
    } catch (error) {
        console.error("Error sending email:", error)
        // Don't throw logic breaking error, just return false
        return { success: false, error }
    }
}
