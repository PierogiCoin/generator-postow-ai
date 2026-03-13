import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
    console.error("No API key");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function list() {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        console.log(data.models.map(m => m.name));
    } catch (e) {
        console.error(e);
    }
}
list();
