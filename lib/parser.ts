import { googleDriveOCR } from "./googleDriveOCR";
import fs from "fs";
import path from "path";
import os from "os";

export async function parseResume(buffer: Buffer, mimeType: string): Promise<string> {
    try {
        console.log(`[ResumeParser] Starting parse for type: ${mimeType}`);

        if (
            mimeType.includes("wordprocessingml") ||
            mimeType.includes("msword") ||
            mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
            mimeType.includes("officedocument")
        ) {
            console.log("[ResumeParser] DOC/DOCX detected. Using Mammoth...");
            const mammoth = await import("mammoth").then(m => (m as any).default || m);
            const result = await mammoth.extractRawText({ buffer });
            const text = result.value.trim();

            if (text.length < 50) {
                console.warn("[ResumeParser] DOCX extracted text is too short.");
            }
            return text;

        } else if (mimeType.includes("pdf") || mimeType === "application/pdf") {
            console.log("[ResumeParser] PDF detected. Using pdf-parse...");
            let text = "";
            try {
                const pdf = await import("pdf-parse").then(m => (m as any).default || m);
                const data = await pdf(buffer);
                text = data.text.trim();
            } catch (pdfError) {
                console.error("[ResumeParser] pdf-parse failed:", pdfError);
            }

            // Fallback to OCR if text is very short/empty
            if (text.length < 100) {
                console.log("[ResumeParser] Text too short, triggering OCR fallback...");
                const tempPath = path.join(os.tmpdir(), `ocr_temp_${Date.now()}.pdf`);
                await fs.promises.writeFile(tempPath, buffer);

                try {
                    const ocrText = await googleDriveOCR(tempPath);
                    if (ocrText && ocrText.length > text.length) {
                        text = ocrText;
                    }
                } finally {
                    if (fs.existsSync(tempPath)) await fs.promises.unlink(tempPath);
                }
            }
            return text;

        } else {
            console.warn(`[ResumeParser] Unsupported Mime Type: ${mimeType}`);
            return ""; // Best effort
        }

    } catch (error: any) {
        console.error("[ResumeParser] Final Parse Error:", error);
        return ""; // Never throw to avoid breaking submission
    }
}
