import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios'; 
import { GoogleAuth } from 'google-auth-library'; 
import path from 'path'; 
import { fileURLToPath } from 'url'; 
import { dirname } from 'path'; 
import * as fs from 'fs'; 

// --- Rozwiązanie dla __dirname w ES Modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// ---------------------------------------------

// Ładujemy plik .env z BIEŻĄCEGO KATALOGU ROBOCZEGO (server/).
dotenv.config(); 

const app = express();
const port = process.env.PORT || 3001;

// ===============================================
// 🟢 DANE KONFIGURACYJNE DLA VERTEX AI
const PROJECT_ID = "gen-lang-client-0717059111"; // Twój poprawny Project ID
const REGION = "europe-west4"; // ⬅️ KOREKTA: Wrócono do europe-west4
// =MIEJSCE NA KLUCZ SERVICE ACCOUNT================
// KOREKTA: Poprawna nazwa pliku klucza
const SERVICE_ACCOUNT_KEY_FILE = path.join(__dirname, 'gen-lang-client-0717059111-29378ed6c5a1.json');
// ===============================================

// --- INICJALIZACJA AUTH (KONTO USŁUGI) ---
// Używamy pliku klucza Service Account, aby uzyskać token dostępu OAuth2
const auth = new GoogleAuth({
    // Jawne wskazanie pliku JSON z kluczem Service Account
    keyFile: SERVICE_ACCOUNT_KEY_FILE, 
    // ⬅️ KOREKTA: Wrócono do dwóch scopes (poprawia błąd 403)
    scopes: [
        'https://www.googleapis.com/auth/cloud-platform', 
        'https://www.googleapis.com/auth/generative-language' 
    ], 
});

// 🟢 KLUCZOWE: Używamy Service Account do uwierzytelnienia na Vertex AI.
const genAI = new GoogleGenAI({ 
    auth: auth,
    // BasePath MUSI być regionalnym endpointem Vertex AI
    basePath: `${REGION}-aiplatform.googleapis.com`, 
}); 

// --- OSTRZEŻENIA ---
if (!fs.existsSync(SERVICE_ACCOUNT_KEY_FILE)) {
    console.error(`❌ KRYTYCZNY BŁĄD KONFIGURACJI: Nie znaleziono klucza Service Account pod ścieżką: ${SERVICE_ACCOUNT_KEY_FILE}`);
    console.error(`Pamiętaj, aby plik: ${path.basename(SERVICE_ACCOUNT_KEY_FILE)} znajdował się w katalogu serwera!`);
    // Serwer nadal się uruchomi, ale API Google nie zadziała
}

// --- KONFIGURACJA CORS (Bez zmian) ---
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); 
    try {
      const u = new URL(origin);
      const host = u.hostname;
      
      const isGitHubDev = /\.app\.github\.dev$/.test(host);
      const isLocalhost = host === 'localhost' || host === '127.0.0.1';
      const isLocalNetworkIP = /^192\.168\.\d+\.\d+$/.test(host) || host === '192.168.0.38';

      if (isGitHubDev || isLocalhost || isLocalNetworkIP) {
        return callback(null, true);
      }
      return callback(new Error(`Not allowed by CORS: ${origin}`), false);
    } catch {
      return callback(new Error(`Invalid origin URL: ${origin}`), false);
    }
  },
  credentials: true,
  methods: ['GET','POST','OPTIONS'],
  allowedHeaders: ['Content-Type','x-user-id', 'Authorization'],
};
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));


app.use((req, res, next) => {
    if (req.method === 'OPTIONS' && req.header('Origin')) {
        res.header('Access-Control-Allow-Credentials', 'true');
        return res.status(204).end(); 
    }
    next();
});

app.use(express.json());

// --- INICJALIZACJA SUPABASE (Bez zmian) ---
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Supabase URL (VITE_SUPABASE_URL) or Service Key (SUPABASE_SERVICE_KEY) is not defined in .env file");
}
const supabase = createClient(supabaseUrl, supabaseServiceKey);


// --- MAPOWANIE MODULI (Bez zmian) ---
const mapModel = (requested?: string): string => {
  const m = (requested || '').toLowerCase();
  // Używamy nazw modeli Vertex AI
  if (!m) return 'gemini-2.5-flash';
  if (m.includes('2.5') && m.includes('pro')) return 'gemini-2.5-pro';
  if (m.includes('pro')) return 'gemini-2.5-pro';
  if (m.includes('flash')) return 'gemini-2.5-flash';
  return 'gemini-2.5-flash';
};

// --- ROUTES ---

app.get('/api/trends', (req, res) => {
    res.json({ trends: [] }); 
});


// Generic content generation (Używa Service Account przez genAI)
app.post('/api/generate-content', async (req, res) => {
  try {
    const { model = 'gemini-2.5-flash', contents, config } = req.body || {};
    const modelId = mapModel(model);
    
    const textGenerationConfig = {
        temperature: config?.temperature,
        maxOutputTokens: config?.maxOutputTokens,
        topP: config?.topP,
        topK: config?.topK,
        stopSequences: config?.stopSequences,
    };
    
    const response = await genAI.models.generateContent({ 
        model: modelId, 
        contents: typeof contents === 'string' ? [{ role: 'user', parts: [{ text: contents }] }] : contents,
        config: {
            ...textGenerationConfig,
            systemInstruction: config?.systemInstruction,
        }
    });

    const text = response.text;
    res.json({ text });

  } catch (error: any) {
    console.error('Error in /api/generate-content:', error);
    if (error.message?.includes('Safety') || error.message?.includes('Blocked')) {
         return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message || 'Generation failed', details: error.stack });
  }
});

// Streaming endpoint (Używa Service Account przez genAI)
app.post('/api/generate-content-stream', async (req, res) => {
  try {
    const { model = 'gemini-2.5-flash', contents, config } = req.body || {};
    const modelId = mapModel(model);

    const textGenerationConfig = {
        temperature: config?.temperature,
        maxOutputTokens: config?.maxOutputTokens,
        topP: config?.topP,
        topK: config?.topK,
        stopSequences: config?.stopSequences,
    };
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let contentArray = contents;
    if (typeof contents === 'string') {
      contentArray = [{ role: 'user', parts: [{ text: contents }] }];
    } else if (!Array.isArray(contents)) {
       contentArray = []; 
    }
    
    const result = await genAI.models.generateContentStream({ 
        model: modelId, 
        contents: contentArray, 
        config: {
            ...textGenerationConfig,
            systemInstruction: config?.systemInstruction,
        } 
    });

    for await (const chunk of result) { 
      const t = chunk.text; 
      if (t && t.length > 0) {
        res.write(`data: ${JSON.stringify({ text: t })}\n\n`);
      }
    }
    res.write(`data: ${JSON.stringify({ event: 'done' })}\n\n`);
    res.end();

  } catch (error: any) {
    console.error('Error in /api/generate-content-stream:', error);
    try { 
        res.write(`data: ${JSON.stringify({ error: error.message || 'stream failed' })}\n\n`); 
    } catch {}
    res.end();
  }
});

// Endpoint for text generation (Używa Service Account przez genAI)
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, history, model = 'gemini-2.5-flash' } = req.body;
    const modelId = mapModel(model);
    
    // Utworzenie chat sesji używając klienta genAI skonfigurowanego do Vertex AI
    const chat = genAI.chats.create({ 
        model: modelId, 
        history: history 
    });

    const result = await chat.sendMessageStream({ message: prompt });

    res.setHeader('Content-Type', 'text/plain');
    for await (const chunk of result) {
      res.write(chunk.text);
    }
    res.end();

  } catch (error: any) {
    console.error('Error in /api/generate:', error);
    res.status(500).json({ error: error.message });
  }
});


// Prawdziwe generowanie wideo (SYMULACJA) - Bez zmian
app.post('/api/generate-media', async (req, res) => {
    const { prompt, userId, mediaType = 'video' } = req.body;

    if (!prompt || !userId) {
        return res.status(400).json({ error: 'Prompt and userId are required.' });
    }

    if (mediaType !== 'video') {
        return res.status(400).json({ error: 'This endpoint only handles video generation.' });
    }

    try {
        const TEMPORARY_VIDEO_URL = 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/Big_Buck_Bunny_1080_10s_1MB.mp4'; 
        console.log(`[server] Downloading generated video from: ${TEMPORARY_VIDEO_URL}`);

        const downloadResponse = await axios.get(TEMPORARY_VIDEO_URL, {
            responseType: 'arraybuffer',
        });
        const videoBuffer = Buffer.from(downloadResponse.data);
        
        if (videoBuffer.length === 0) {
            throw new Error('Downloaded video file is empty.');
        }

        const fileName = `generated_videos/${userId}_${Date.now()}.mp4`;
        const contentType = 'video/mp4';

        console.log(`[server] Uploading video to Supabase Storage as ${fileName}...`);
        const { error: uploadError } = await supabase.storage
            .from('generated_content') 
            .upload(fileName, videoBuffer, {
                contentType: contentType,
                upsert: true,
            });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
            .from('generated_content')
            .getPublicUrl(fileName);
        
        const publicUrl = publicUrlData.publicUrl;
        console.log('[server] Public URL from Supabase:', publicUrl);

        const { error: dbError } = await supabase.from('generated_content').insert({
            user_id: userId,
            prompt: prompt,
            content_type: mediaType,
            media_url: publicUrl,
        });

        if (dbError) throw dbError;

        res.json({ mediaUrl: publicUrl });

    } catch (error: any) {
        console.error('Error in /api/generate-media:', error.message);
        res.status(500).json({ 
            error: 'Failed to generate, download, or upload media.', 
            details: error.message 
        });
    }
});


// Real image generation using Google Imagen models via REST API (Używa Service Account)
app.post('/api/generate-images', async (req, res) => {
  try {
    if (PROJECT_ID === "TWÓJ_PROJECT_ID") {
         return res.status(500).json({ message: "Błąd konfiguracji Vertex AI. Wypełnij PROJECT_ID w index.ts" });
    }

    // Pobranie tokena z konta usługi
    const accessToken = await auth.getAccessToken();

    if (!accessToken) {
        console.error('[Imagen 500] Brak tokena dostępu. Sprawdź klucz Service Account i uprawnienia.');
        return res.status(500).json({ message: 'Authorization token is missing for REST endpoint /api/generate-images' });
    }

    console.log('[API/generate-images] Otrzymane body:', req.body); 
    
    // Model Vertex AI
    const model = 'imagen-4.0-generate-002'; // ⬅️ KOREKTA: Używamy nowszego modelu
    
    const { prompt, config } = req.body || {}; 
    const userId = req.header('x-user-id') || 'unknown'; 

    if (typeof prompt !== 'string' || prompt.trim().length === 0) {
      console.error(`[Imagen 400] WALIDACJA SERWERA: Brak prompta. UserID: ${userId}`);
      return res.status(400).json({ message: 'prompt is required' });
    }
    console.log(`[Imagen] Generowanie obrazów dla prompta: ${prompt.substring(0, 50)}... Użyty model: ${model}. UserID: ${userId}`);


    // Endpoint Vertex AI. Używamy ZMIENNEJ REGION (europe-west4)
    const url = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/${model}:generateImages`;
    
    const requestBody = {
        instances: [
            { prompt: prompt },
        ],
        parameters: {
            number_of_images: config?.numberOfImages || 1,
            output_mime_type: config?.outputMimeType || 'image/jpeg',
            aspect_ratio: config?.aspectRatio || '1:1', 
        }
    } as any;

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(requestBody),
    });

    // POPRAWKA OBSŁUGI BŁĘDÓW: Zapisujemy pełną odpowiedź 404
    if (!resp.ok) {
        const errorText = await resp.text(); 
        let jsonErrorDetails: any = { 
            message: `Błąd komunikacji z Imagen API (HTTP ${resp.status})`, 
            details: errorText
        };
        
        try {
             jsonErrorDetails = JSON.parse(errorText); 
        } catch {} 
        
        console.error(`[Imagen API] Błąd HTTP ${resp.status}:`, errorText); 
        
        // Zwracamy błąd 
        return res.status(resp.status).json({
            message: jsonErrorDetails.error?.message || jsonErrorDetails.message || `Błąd HTTP ${resp.status}`, 
            details: jsonErrorDetails,
            rawResponse: errorText.substring(0, 500) 
        });
    }

    // Jeśli status jest OK, parsujemy jako JSON
    const json = await resp.json();

    // Parsowanie odpowiedzi Vertex AI
    const images: { mimeType: string; imageBytes: string }[] = [];
    const predictions = json.predictions || [];
    
    for (const p of predictions) {
        if (p.image?.imageBytes) {
            images.push({ mimeType: p.image.mimeType || 'image/jpeg', imageBytes: p.image.imageBytes });
        }
    }

    if (images.length === 0) {
      return res.status(502).json({ message: 'No images returned from model.' });
    }

    const selected = images.slice(0, 1);
    const generatedImages = selected.map((img) => ({ image: img }));

    const publicUrls: string[] = [];
    for (let i = 0; i < selected.length; i++) {
      try {
        const img = selected[i];
        const buffer = Buffer.from(img.imageBytes, 'base64');
        const ext = (img.mimeType === 'image/png') ? 'png' : 'jpg';
        const fileName = `generated_images/${Date.now()}_${i}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('generated_content')
          .upload(fileName, buffer, { contentType: img.mimeType, upsert: true });
        if (uploadError) throw uploadError;
        const { data: pub } = supabase.storage.from('generated_content').getPublicUrl(fileName);
        if (pub?.publicUrl) publicUrls.push(pub.publicUrl);
      } catch (e) {
        console.warn('Upload image to Supabase failed:', e);
      }
    }

    res.json({ generatedImages, publicUrls });
  } catch (error: any) {
    console.error('Error in /api/generate-images:', error);
    res.status(500).json({ message: error.message || 'Image generation failed' });
  }
});


app.listen(port, () => {
  console.log(`[server] Server is running on http://localhost:${port}`);
});