
import { NextResponse } from "next/server";
// import { googleDriveOCR } from "@/lib/googleDriveOCR";

export async function GET() {
  return NextResponse.json({
    success: false,
    message: "Google Drive OCR test is currently disabled due to missing dependency."
  });
}
