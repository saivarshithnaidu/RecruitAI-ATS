import { google } from "googleapis";
import fs from "fs";

const CLIENT_EMAIL = process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const FOLDER_ID = process.env.GOOGLE_DRIVE_RESUME_FOLDER_ID;

export async function googleDriveOCR(filePath: string): Promise<string> {
    if (!CLIENT_EMAIL || !PRIVATE_KEY) {
        console.warn("[GoogleDriveOCR] Missing Google Drive credentials. Skipping OCR.");
        return "";
    }

    try {
        const auth = new google.auth.JWT(
            CLIENT_EMAIL,
            undefined,
            PRIVATE_KEY,
            ["https://www.googleapis.com/auth/drive"]
        );

        const drive = google.drive({ version: "v3", auth });

        // 1. Upload file with OCR hint
        console.log("[GoogleDriveOCR] Uploading file for OCR...");
        const response = await drive.files.create({
            requestBody: {
                name: `ocr_${Date.now()}.pdf`,
                parents: FOLDER_ID ? [FOLDER_ID] : undefined,
                mimeType: "application/pdf"
            },
            media: {
                mimeType: "application/pdf",
                body: fs.createReadStream(filePath)
            },
            // @ts-ignore
            ocrLanguage: "en",
            fields: "id"
        });

        const fileId = response.data.id;
        if (!fileId) throw new Error("Upload failed, no file ID returned");

        // 2. Export as plain text
        console.log(`[GoogleDriveOCR] Exporting file ${fileId} as text...`);
        const exportResponse = await drive.files.export({
            fileId: fileId,
            mimeType: "text/plain"
        });

        const extractedText = exportResponse.data as string;

        // 3. Cleanup (delete the temp file from Drive)
        await drive.files.delete({ fileId }).catch(e => console.error("[GoogleDriveOCR] Cleanup failed:", e.message));

        console.log(`[GoogleDriveOCR] OCR Successful. Extracted ${extractedText.length} characters.`);
        return extractedText;

    } catch (error: any) {
        console.error("[GoogleDriveOCR] Critical Error:", error.message);
        return ""; // Return empty string on failure instead of throwing
    }
}
