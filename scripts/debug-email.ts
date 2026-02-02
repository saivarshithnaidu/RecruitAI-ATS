import dotenv from 'dotenv';
import path from 'path';
import nodemailer from 'nodemailer';
import fs from 'fs';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Helper for dual logging
function log(msg: string) {
    console.log(msg);
    fs.appendFileSync('debug_email_log.txt', msg + '\n');
}

async function main() {
    fs.writeFileSync('debug_email_log.txt', '--- Email Debug Log ---\n');
    log("Starting Debug Script");

    // 1. Check Env Vars
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const fromEmail = process.env.MAIL_FROM_EMAIL;

    log("Config:");
    log(`HOST: ${host}`);
    log(`PORT: ${port}`);
    log(`USER: ${user}`);
    log(`PASS: ${pass ? '******' + pass.slice(-4) : 'UNDEFINED'}`);
    log(`FROM: ${fromEmail}`);

    if (!host || !user || !pass) {
        log("❌ Missing required environment variables.");
        return;
    }

    // 2. Transporter Setup
    const transporter = nodemailer.createTransport({
        host: host,
        port: parseInt(port || '587'),
        secure: parseInt(port || '587') === 465,
        auth: {
            user: user,
            pass: pass,
        },
        debug: true,
        logger: {
            info: (msg: any) => log(`[SMTP INFO] ${msg}`),
            debug: (msg: any) => log(`[SMTP DEBUG] ${msg}`),
            error: (msg: any) => log(`[SMTP ERROR] ${msg}`),
            warn: (msg: any) => log(`[SMTP WARN] ${msg}`),
        }
    } as any);

    // 3. Verify Connection
    log("\nVerifying SMTP Connection...");
    try {
        await transporter.verify();
        log("✅ SMTP Connection Verified!");
    } catch (error) {
        log(`❌ SMTP Connection Failed: ${error}`);
        return;
    }

    // 4. Send Test Email
    const testTo = 'pujalasaivarshith@gmail.com';
    log(`\nAttempting to send test email to: ${testTo}`);

    try {
        const info = await transporter.sendMail({
            from: `"${process.env.MAIL_FROM_NAME || 'Debug'}" <${fromEmail}>`,
            to: testTo,
            subject: 'RecruitAI Debug Email',
            html: '<h1>It works!</h1><p>This is a test email from the debug script.</p>',
        });
        log(`✅ Message sent: ${info.messageId}`);
    } catch (error) {
        log(`❌ Send Mail Failed: ${error}`);
    }
}

main();
