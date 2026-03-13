import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
    console.error("No API key");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    const modelsToCheck = [
        "gemini-flash-latest",
        "gemini-flash-lite-latest",
        "gemini-pro-latest",
        "gemini-flash-latest",
        "gemini-2.0-flash"
    ];

    for (const m of modelsToCheck) {
        try {
            console.log(`Checking model: ${m}`);
            const model = genAI.getGenerativeModel({ model: m });
            const result = await model.generateContent("test");
            console.log(`${m} works:`, result.response.text().substring(0, 10));
        } catch (e: any) {
            console.error(`${m} failed:`, e.message);
        }
    }
}

listModels();
