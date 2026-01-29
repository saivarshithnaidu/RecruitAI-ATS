
import { NextResponse } from "next/server";
import { googleDriveOCR } from "@/lib/googleDriveOCR";
import fs from "fs";
import path from "path";
import os from "os";

export async function GET() {
    try {
        // Create a dummy PDF file (minimal valid PDF structure to avoid Drive rejection)
        // This is an empty page PDF.
        const pdfContent = `%PDF-1.4
1 0 obj
<<
  /Type /Catalog
  /Pages 2 0 R
>>
endobj
2 0 obj
<<
  /Type /Pages
  /Kids [3 0 R]
  /Count 1
>>
endobj
3 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 612 792]
  /Resources << >>
>>
endobj
xref
0 4
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000155 00000 n 
trailer
<<
  /Size 4
  /Root 1 0 R
>>
startxref
255
%%EOF`;

        const tempPath = path.join(os.tmpdir(), `test_drive_${Date.now()}.pdf`);
        await fs.promises.writeFile(tempPath, pdfContent);

        console.log("Starting Google Drive Test Upload...");

        // Call the OCR utility
        // It uploads, tries to extract text, and deletes.
        // Even if text is empty (since PDF is empty), success means upload worked.
        const text = await googleDriveOCR(tempPath);

        // Cleanup
        if (fs.existsSync(tempPath)) await fs.promises.unlink(tempPath);

        return NextResponse.json({
            success: true,
            message: "Google Drive Upload & OCR executed successfully.",
            extractedText: text
        });

    } catch (error: any) {
        console.error("Google Drive Test Failed:", error);
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
