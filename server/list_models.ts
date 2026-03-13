import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY;

async function listAllModels() {
    try {
        const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        console.log("Models (v1beta):", response.data.models.map(m => m.name));
    } catch (e) {
        console.error("List Models (v1beta) failed:", e.response?.data || e.message);
    }

    try {
        const response = await axios.get(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
        console.log("Models (v1):", response.data.models.map(m => m.name));
    } catch (e) {
        console.error("List Models (v1) failed:", e.response?.data || e.message);
    }
}

listAllModels();
