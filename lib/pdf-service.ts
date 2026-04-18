/**
 * ROBUST PDF PARSING SERVICE
 * Uses HuggingFace PDF API as Primary with Health Check, Retry & Timeout
 */

const HF_SERVICE_URL = "https://saivarshithvc-pdf-service-api-univreseai.hf.space";
const MAX_RETRIES = 3;
const REQUEST_TIMEOUT = 15000; // 15 seconds

interface ParseResponse {
    success: boolean;
    text: string;
    error?: string;
    parsing_time?: string;
}

/**
 * Checks if the HuggingFace service is awake and healthy
 */
async function checkServiceHealth(): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${HF_SERVICE_URL}/health`, { 
            method: 'GET',
            signal: controller.signal 
        });
        
        clearTimeout(timeoutId);
        return response.ok;
    } catch (e) {
        console.warn("[PDF-Service] Health check failed. Service might be sleeping.");
        return false;
    }
}

/**
 * Extracts text from PDF buffer using HuggingFace Service with Retry & Fallback
 */
export async function extractTextWithHF(buffer: Buffer, fileName: string = "resume.pdf"): Promise<string | null> {
    const startTime = Date.now();
    
    // 1. Health Check
    const isHealthy = await checkServiceHealth();
    if (!isHealthy) {
        console.log("[PDF-Service] Service not healthy, skipping to retries/fallback.");
    }

    // 2. Retry Loop
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`[PDF-Service] Extraction attempt ${attempt}/${MAX_RETRIES}...`);
            
            const formData = new FormData();
            const blob = new Blob([buffer], { type: 'application/pdf' });
            formData.append('file', blob, fileName);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

            const response = await fetch(`${HF_SERVICE_URL}/extract`, {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`);
            }

            const data: ParseResponse = await response.json();
            
            if (data.success && data.text && data.text.length > 50) {
                const duration = ((Date.now() - startTime) / 1000).toFixed(2);
                console.log(`[PDF-Service] SUCCESS! Parsed in ${duration}s (Service Time: ${data.parsing_time})`);
                return data.text;
            }

            throw new Error("Invalid response format or empty text");

        } catch (error: any) {
            console.error(`[PDF-Service] Attempt ${attempt} failed:`, error.message);
            
            if (attempt < MAX_RETRIES) {
                const delay = 2000 + (attempt * 1000); // Exponential delay 3s, 4s...
                console.log(`[PDF-Service] Retrying in ${delay/1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    console.warn("[PDF-Service] All HuggingFace attempts failed. Falling back to local parser.");
    return null;
}
