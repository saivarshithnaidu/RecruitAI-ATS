
import { generateExamWithOllama } from "@/lib/ai";
import { config } from "dotenv";
config();

async function testAI() {
    console.log("Testing Ollama Exam Generation...");
    try {
        const result = await generateExamWithOllama("Frontend Developer", ["React", "Typescript"], "Medium");
        console.log("Success!");
        console.log("Questions Generated:", result.questions.length);
        console.log("First Question:", result.questions[0]);
    } catch (error) {
        console.error("Test Failed:", error);
    }
}

testAI();
