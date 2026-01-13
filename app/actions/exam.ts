"use server"

export async function createExam() {
    throw new Error("Exam features are being migrated.");
}

export async function submitExam(examId: string, answers: Record<string, string>) {
    throw new Error("Exam features are being migrated.");
    return { success: false, score: 0, passed: false };
}

export async function getExam(id: string) {
    // Stub
    return {
        id: id,
        title: "Migrated Exam",
        role: "General",
        questions: []
    }
}
