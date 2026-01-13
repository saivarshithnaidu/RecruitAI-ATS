import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env.local');
const content = fs.readFileSync(envPath, 'utf8');

const lines = content.split('\n');
lines.forEach(line => {
    if (line.startsWith('SMTP_USER=')) console.log('Current ' + line);
    if (line.startsWith('EMAIL_FROM=')) console.log('Current ' + line);
});
