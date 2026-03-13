import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({apiKey: 'dummy'});
console.log(Object.keys(ai));
console.log(ai.models ? Object.keys(ai.models) : 'no models');
