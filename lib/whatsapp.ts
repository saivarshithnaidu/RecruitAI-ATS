
const TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

type WhatsAppTemplate = {
    name: string;
    language: { code: string };
    components: any[];
}

async function sendWhatsAppMessage(to: string, template: WhatsAppTemplate) {
    if (!TOKEN || !PHONE_ID) {
        console.error("WhatsApp Error: Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID");
        return { success: false, error: "Configuration Error" };
    }

    const cleanPhone = to.replace(/\D/g, '');
    const url = `https://graph.facebook.com/v22.0/${PHONE_ID}/messages`;

    const payload = {
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "template",
        template: template
    };

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
            console.error("WhatsApp API Error Response:", JSON.stringify(data, null, 2));
            const errorCode = data.error?.code;
            const errorSubcode = data.error?.error_subcode;
            const errorMessage = data.error?.message || "";

            if (errorCode === 131030 || errorMessage.includes("allowed list") || errorSubcode === 2494073) {
                console.warn("WhatsApp Test Mode Restriction detected. Recipient might not be verified.");
                return { success: false, error: "TEST_MODE_RESTRICTION" };
            }

            return { success: false, error: errorMessage || "Failed to send WhatsApp message" };
        }

        console.log("WhatsApp Message Sent Successfully:", data);
        return { success: true, messageId: data.messages?.[0]?.id };

    } catch (error: any) {
        console.error("WhatsApp Network/Server Error:", error);
        // Do NOT expose system error details to UI if possible, but for debugging keep it.
        return { success: false, error: error.message };
    }
}

export async function sendWhatsAppOtp({ to, otp }: { to: string; otp: string; }) {
    return sendWhatsAppMessage(to, {
        name: "otp_verification", // Ensure this template exists in Meta
        language: { code: "en_US" },
        components: [
            {
                type: "body",
                parameters: [
                    { type: "text", text: otp }
                ]
            }
        ]
    });
}

export async function sendExamInvite(to: string, examTitle: string, link: string) {
    return sendWhatsAppMessage(to, {
        name: "exam_invite", // User must create this template or map to existing "hello_world" for test
        language: { code: "en_US" },
        components: [
            {
                type: "body",
                parameters: [
                    { type: "text", text: examTitle },
                    { type: "text", text: link }
                ]
            }
        ]
    });
}

export async function sendInterviewSchedule(to: string, candidateName: string, date: string, link: string) {
    return sendWhatsAppMessage(to, {
        name: "interview_schedule", // User must create this template
        language: { code: "en_US" },
        components: [
            {
                type: "body",
                parameters: [
                    { type: "text", text: candidateName },
                    { type: "text", text: date },
                    { type: "text", text: link }
                ]
            }
        ]
    });
}

export async function sendExamReminder(to: string, examTitle: string, time: string) {
    return sendWhatsAppMessage(to, {
        name: "exam_reminder", // User must create this template
        language: { code: "en_US" },
        components: [
            {
                type: "body",
                parameters: [
                    { type: "text", text: examTitle },
                    { type: "text", text: time }
                ]
            }
        ]
    });
}
