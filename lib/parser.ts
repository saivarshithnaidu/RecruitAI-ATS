const pdf = require("pdf-parse");
import mammoth from "mammoth"

export async function parseResume(buffer: Buffer, mimeType: string): Promise<string> {
    try {
        if (mimeType === "application/pdf") {
            const data = await pdf(buffer)
            return data.text
        } else if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
            const result = await mammoth.extractRawText({ buffer })
            return result.value
        }
    } catch (error) {
        console.error("Parse Error:", error)
    }
    return ""
}
