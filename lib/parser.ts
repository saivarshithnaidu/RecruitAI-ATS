const pdf = require("pdf-parse");
import mammoth from "mammoth";
import fs from "fs";
import os from "os";
import path from "path";
import { googleDriveOCR } from "./googleDriveOCR";

export async function parseResume(buffer: Buffer, mimeType: string): Promise<string> {
    try {
        if (mimeType === "application/pdf") {
            let text = "";
            let useOCR = false;

            // 1. Try pdf-parse
            try {
                const data = await pdf(buffer);
                text = data.text.trim();
                // Check for scanned PDF (empty or very short text)
                if (text.length < 50) {
                    console.log("PDF text too short (<50 chars), triggering OCR fallback...");
                    useOCR = true;
                }
            } catch (pdfError) {
                console.warn("pdf-parse failed, triggering OCR fallback...", pdfError);
                useOCR = true;
            }

            // 2. Fallback to Google Drive OCR
            if (useOCR) {
                const tempFilePath = path.join(os.tmpdir(), `resume_${Date.now()}.pdf`);
                try {
                    await fs.promises.writeFile(tempFilePath, buffer);
                    text = await googleDriveOCR(tempFilePath);
                } catch (ocrError: any) {
                    console.error("OCR Fallback Failed:", ocrError);
                    throw new Error("Failed to parse PDF Resume (OCR failed)");
                } finally {
                    if (fs.existsSync(tempFilePath)) {
                        await fs.promises.unlink(tempFilePath);
                    }
                }
            }

            return text;

        } else if (mimeType.includes("wordprocessingml") || mimeType.includes("msword")) { // Handle both docx variants if simple check fails
            console.log(`[ResumeParser] Processing DOC/DOCX file (Mime: ${mimeType})`);
            const result = await mammoth.extractRawText({ buffer });
            const text = result.value.trim();
            console.log(`[ResumeParser] DOCX Parse Success. Length: ${text.length}`);
            return text;
        }
    } catch (error: any) {
        console.error("Final Parse Error:", error);
        // Rethrow so the action knows it failed
        throw error;
    }
    return "";
}
