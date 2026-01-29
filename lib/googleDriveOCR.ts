
import { google } from 'googleapis';
import fs from 'fs';

export async function googleDriveOCR(filePath: string): Promise<string> {
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountJson) {
        throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_JSON env var");
    }

    let credentials;
    try {
        credentials = JSON.parse(serviceAccountJson);
    } catch (e) {
        throw new Error("Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON");
    }

    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive']
    });

    const drive = google.drive({ version: 'v3', auth });
    let fileId = '';

    try {
        // 1. Upload PDF as Google Doc (trigger OCR)
        const uploadRes = await drive.files.create({
            requestBody: {
                name: 'temp_ocr_resume_' + Date.now(),
                mimeType: 'application/vnd.google-apps.document',
                parents: process.env.GOOGLE_DRIVE_RESUME_FOLDER_ID ? [process.env.GOOGLE_DRIVE_RESUME_FOLDER_ID] : []
            },
            media: {
                mimeType: 'application/pdf',
                body: fs.createReadStream(filePath)
            }
        });

        fileId = uploadRes.data.id || '';
        if (!fileId) throw new Error("Failed to upload file to Google Drive");
        console.log(`[GoogleOCR] Uploaded fileId: ${fileId}`);

        // 2. Export as Plain Text
        const exportRes = await drive.files.export({
            fileId,
            mimeType: 'text/plain'
        });

        const text = typeof exportRes.data === 'string' ? exportRes.data : String(exportRes.data);
        return text.trim();

    } catch (error: any) {
        console.error("Google Drive OCR Error:", error);
        throw new Error("Google OCR Failed: " + (error.message || "Unknown error"));
    } finally {
        // 3. Cleanup: Delete the file from Drive
        if (fileId) {
            try {
                await drive.files.delete({ fileId });
            } catch (cleanupError) {
                console.warn("Failed to delete temp Drive file:", cleanupError);
            }
        }
    }
}
