import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const result = dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

if (result.error) {
    console.error("Could not load .env.local");
} else {
    const pass = process.env.SMTP_PASS;
    const user = process.env.SMTP_USER;

    console.log(`User: '${user}'`);
    if (pass) {
        console.log(`Password length: ${pass.length}`);
        if (pass.trim().length !== pass.length) {
            console.error("WARNING: Password has leading or trailing whitespace!");
            console.log(`Start char code: ${pass.charCodeAt(0)}`);
            console.log(`End char code: ${pass.charCodeAt(pass.length - 1)}`);
        } else {
            console.log("Password has no leading/trailing whitespace.");
        }

        // check for common issues
        if (pass.includes(' ')) {
            console.log("WARNING: Password contains spaces in the middle. App Passwords usually involve spaces but they should be removed or handled carefully.");
        }
    } else {
        console.error("SMTP_PASS is missing.");
    }
}
