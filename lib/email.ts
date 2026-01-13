import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false, // true for 465, false for other ports
    auth: {
        // Use SMTP_USER if it looks like an email, otherwise fallback to EMAIL_FROM
        // Extract email if it's in "Name <email>" format
        user: (process.env.SMTP_USER?.includes('<') ? process.env.SMTP_USER.match(/<(.+)>/)?.[1] : process.env.SMTP_USER) ||
            (process.env.EMAIL_FROM?.includes('<') ? process.env.EMAIL_FROM.match(/<(.+)>/)?.[1] : process.env.EMAIL_FROM),
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
        const info = await transporter.sendMail({
            from: `"${process.env.EMAIL_FROM_NAME || 'RecruitAI'}" <${process.env.EMAIL_FROM}>`,
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
