
import nodemailer from "nodemailer";

async function main() {
    console.log("Testing Email Sending...");

    // Using the credentials provided by user, but correcting the SMTP_USER
    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
            user: "recruitaiats@gmail.com", // Corrected from "Recruit AI"
            pass: "wgvk cana atpg yvmb",    // App Password
        },
    });

    try {
        const info = await transporter.sendMail({
            from: '"Recruit AI" <recruitaiats@gmail.com>',
            to: "recruitaiats@gmail.com", // Send to self to test
            subject: "Test Email from RecruitAI Fix",
            html: "<b>It works!</b> The SMTP settings have been corrected.",
        });

        console.log("✅ Email sent successfully!");
        console.log("Message ID:", info.messageId);
    } catch (error) {
        console.error("❌ Failed to send email:", error);
    }
}

main();
