export async function sendWhatsAppOtp({
    to,
    otp,
}: {
    to: string;
    otp: string;
}) {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneId) {
        console.error("WhatsApp Error: Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID");
        return { success: false, error: "Configuration Error" };
    }

    // Sanitize phone number: Remove '+' and spaces, ensure it's just digits
    // Meta requires country code without '+', but accepts it in 'to' field usually.
    // Best practice: strip non-digits.
    const cleanPhone = to.replace(/\D/g, '');

    const url = `https://graph.facebook.com/v22.0/${phoneId}/messages`;

    const payload = {
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "template",
        template: {
            name: "otp_verification",
            language: { code: "en_US" },
            components: [
                {
                    type: "body",
                    parameters: [
                        { type: "text", text: otp }
                    ]
                }
            ]
        }
    };

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
            console.error("WhatsApp API Error Response:", JSON.stringify(data, null, 2));

            // Check for Test Mode Restriction (Error 131030)
            const errorCode = data.error?.code;
            const errorSubcode = data.error?.error_subcode;
            const errorMessage = data.error?.message || "";

            if (errorCode === 131030 || errorMessage.includes("allowed list") || errorSubcode === 2494073) {
                console.warn("WhatsApp Test Mode Restriction detected. Falling back to Email.");
                return { success: false, error: "TEST_MODE_RESTRICTION" };
            }

            return {
                success: false,
                error: errorMessage || "Failed to send WhatsApp message"
            };
        }

        console.log("WhatsApp OTP Sent Successfully:", data);
        return { success: true, messageId: data.messages?.[0]?.id };

    } catch (error: any) {
        console.error("WhatsApp Network/Server Error:", error);
        return { success: false, error: error.message };
    }
}
