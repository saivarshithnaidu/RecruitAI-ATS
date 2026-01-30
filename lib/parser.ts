import mammoth from "mammoth";

export async function parseResume(buffer: Buffer, mimeType: string): Promise<string> {
    try {
        console.log(`[ResumeParser] Starting parse for type: ${mimeType}`);

        if (
            mimeType.includes("wordprocessingml") ||
            mimeType.includes("msword") ||
            mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
            mimeType.includes("officedocument") // Catch-all for office docs
        ) {
            console.log("[ResumeParser] DOC/DOCX detected. Using Mammoth...");
            try {
                const result = await mammoth.extractRawText({ buffer });
                const text = result.value.trim();
                console.log(`[ResumeParser] DOCX Extraction Success. Length: ${text.length}`);

                if (text.length < 100) {
                    console.warn(`[ResumeParser] Text is extremely short (${text.length} chars). Parsing might be incomplete.`);
                    // The requirement said "mark parse_failed" if < threshold.
                    // The caller (resume.ts) handles logic based on returned text length or specific return values inside parseResume?
                    // Currently resume.ts checks: if (!parsedText || parsedText.length < 300) -> low_quality.
                    // If I return simple text, it will fall into low_quality.
                    // User said: "If text length < threshold (e.g. 100 chars): mark parse_failed".
                    // So I should throw?
                    // If I throw, resume.ts catches and marks 'parse_failed'.
                    throw new Error(`Text too short (${text.length} chars). Extraction failed.`);
                }
                return text;
            } catch (docError) {
                console.error("[ResumeParser] Mammoth Parsing Failed:", docError);
                throw new Error("DOCX Parsing Failed");
            }
        } else {
            console.warn(`[ResumeParser] Unsupported Mime Type: ${mimeType}`);
            throw new Error("Unsupported file type. Please upload a DOC or DOCX file.");
        }

    } catch (error: any) {
        console.error("Final Parse Error:", error);
        throw error;
    }
}
