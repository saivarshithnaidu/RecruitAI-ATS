
export async function sendFast2SMS(phone: string, otp: string): Promise<boolean> {
    const apiKey = process.env.FAST2SMS_API_KEY;

    if (!apiKey) {
        console.warn("⚠️ FAST2SMS_API_KEY missing. Printing OTP to console (Dev Mode).");
        console.log(`[SMS MOCK] To: ${phone}, OTP: ${otp}`);
        return true;
    }

    try {
        const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
            method: "POST",
            headers: {
                "authorization": apiKey,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "route": "otp",
                "variables_values": otp,
                "numbers": phone,
            })
        });

        const data = await response.json();

        if (data && data.return === true) {
            console.log(`✅ Fast2SMS Sent to ${phone.slice(-4)}:`, data.message);
            return true;
        } else {
            console.error("❌ Fast2SMS Failed:", data);
            return false;
        }

    } catch (error) {
        console.error("❌ SMS Network Error:", error);
        return false;
    }
}
