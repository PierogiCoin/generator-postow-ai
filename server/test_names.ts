import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
    console.error("No API key");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function test(name) {
    try {
        console.log("Checking model: " + name);
        const model = genAI.getGenerativeModel({ model: name });
        const result = await model.generateContent("test");
        console.log(name + " works: " + result.response.text().substring(0, 10));
    } catch (e) {
        console.error(name + " failed: " + e.message);
    }
}

async function run() {
    await test("gemini-flash-latest");
    await test("gemini-flash-latest");
    await test("gemini-2.0-flash-exp");
}

run();
