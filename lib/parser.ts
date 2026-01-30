import fs from "node:fs";
import path from "node:path";
import os from "node:os";

/**
 * Robust Resume Parser (Build-Safe)
 * Uses dynamic imports to avoid dependency issues during Next.js build.
 * Note: OCR capabilities removed per user request for simplified text extraction.
 */
export async function parseResume(buffer: Buffer, mimeType: string): Promise<string> {
    try {
        console.log(`[ResumeParser] Starting parse for type: ${mimeType}`);

        // 1. Handle Word Documents (DOC/DOCX)
        if (
            mimeType.includes("wordprocessingml") ||
            mimeType.includes("msword") ||
            mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
            mimeType.includes("officedocument")
        ) {
            console.log("[ResumeParser] DOC/DOCX detected. Using Mammoth...");
            try {
                const mammothModule: any = await import("mammoth");
                const mammoth = mammothModule.default || mammothModule;
                const result = await mammoth.extractRawText({ buffer });
                return result.value.trim();
            } catch (wordError) {
                console.error("[ResumeParser] Mammoth extraction failed:", wordError);
                return "";
            }
        }

        // 2. Handle PDF Documents
        if (mimeType.includes("pdf") || mimeType === "application/pdf") {
            console.log("[ResumeParser] PDF detected. Using pdf-parse...");
            try {
                const pdfModule: any = await import("pdf-parse");
                const pdf = pdfModule.default || pdfModule;
                const data = await pdf(buffer);
                const text = data.text.trim();

                if (text.length < 50) {
                    console.warn("[ResumeParser] Extracted PDF text is very short. Scanned document suspected.");
                }
                return text;
            } catch (pdfError) {
                console.error("[ResumeParser] pdf-parse failed:", pdfError);
                return "";
            }
        }

        console.warn(`[ResumeParser] Unsupported Mime Type: ${mimeType}`);
        return "";

    } catch (error: any) {
        console.error("[ResumeParser] Final Parse Error:", error);
        return ""; // Best effort: return empty string instead of crashing the flow
    }
}
