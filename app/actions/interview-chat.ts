"use server"

export async function sendChatMessage() {
    throw new Error("Chat features are being migrated.");
}

export async function processInterviewMessage(interviewId: string, message: string) {
    throw new Error("Interview features are being migrated.");
    return { message: "System under maintenance", ended: true };
}

export async function getInterviewTranscript(interviewId: string) {
    return [];
}
