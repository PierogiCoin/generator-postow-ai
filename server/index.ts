import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
// ✅ ZMIANA: Używamy oficjalnej biblioteki dla AI Studio
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as fs from 'fs';
import OpenAI from 'openai';
import LumaAI from 'lumaai';
import Replicate from 'replicate';
import logger, { logRequest, logAPICall, logCost, logValidationError, logRateLimit } from './logger.js';
import { initCostTracker, costTracker, COST_ESTIMATES } from './costTracking.js';
import { scoreContent, quickValidate, compareWithBenchmark } from './contentScoring.js';
import { CONTENT_TEMPLATES, getTemplateById, getTemplatesByCategory, getTemplatesByPlatform, applyTemplate } from './contentTemplates.js';

// --- Rozwiązanie dla __dirname w ES Modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ładujemy .env
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// ===============================================
// 🟢 KONFIGURACJA GOOGLE AI STUDIO (GEMINI API)
// ===============================================
const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
  logger.error("❌ BŁĄD: Brak GOOGLE_API_KEY w pliku .env!");
  process.exit(1);
}

// Inicjalizacja klienta AI Studio
const genAI = new GoogleGenerativeAI(apiKey);

// Inicjalizacja OpenAI dla DALL-E
const openaiApiKey = process.env.OPENAI_API_KEY;
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

// Inicjalizacja Luma AI dla Video (Premium)
const lumaApiKey = process.env.LUMA_API_KEY;
const luma = lumaApiKey ? new LumaAI({ authToken: lumaApiKey }) : null;

// Inicjalizacja Replicate dla Video (Budget)
const replicateApiKey = process.env.REPLICATE_API_TOKEN;
const replicate = replicateApiKey ? new Replicate({ auth: replicateApiKey }) : null;

// --- KONFIGURACJA CORS ---
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    try {
      const u = new URL(origin);
      const host = u.hostname;
      const isGitHubDev = /\.app\.github\.dev$/.test(host);
      const isLocalhost = host === 'localhost' || host === '127.0.0.1';
      const isLocalNetworkIP = /^192\.168\.\d+\.\d+$/.test(host);
      const isRailway = /\.up\.railway\.app$/.test(host);

      if (isGitHubDev || isLocalhost || isLocalNetworkIP || isRailway) {
        return callback(null, true);
      }
      return callback(new Error(`Not allowed by CORS: ${origin}`), false);
    } catch {
      return callback(new Error(`Invalid origin URL: ${origin}`), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-user-id', 'Authorization'],
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

// ===============================================
// 🔒 RATE LIMITING CONFIGURATION
// ===============================================

// General API rate limit (applies to all endpoints unless overridden)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false // Disable `X-RateLimit-*` headers
  // Uses default IP-based key generation (handles IPv4/IPv6 properly)
});

// Strict limiter for expensive operations (image/video generation)
const expensiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 generations per hour
  message: 'Generation limit reached. Please wait before creating more content.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for premium users (if user-tier header is set)
    const userTier = req.header('x-user-tier');
    return userTier === 'premium' || userTier === 'enterprise';
  }
});

// Lenient limiter for text generation (cheaper operations)
const textLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // 50 requests per 5 minutes
  message: 'Too many text generation requests. Please slow down.',
  standardHeaders: true,
  legacyHeaders: false
});

// Apply general rate limiter to all routes
app.use(generalLimiter);

// --- INICJALIZACJA SUPABASE ---
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Brak konfiguracji Supabase w .env");
}
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize cost tracker
initCostTracker(supabaseUrl, supabaseServiceKey);


// ===============================================
// 🔄 RETRY LOGIC & ERROR HANDLING HELPERS
// ===============================================

/**
 * Sleep helper for async delays
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry function with exponential backoff
 * Retries on 429 (rate limit), 500 (server error), 503 (service unavailable)
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    retryableErrors?: number[];
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    retryableErrors = [429, 500, 503, 408]
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Check if error is retryable
      const statusCode = error.status || error.response?.status || 0;
      const isRetryable = retryableErrors.includes(statusCode);
      
      // If not retryable or last attempt, throw
      if (!isRetryable || attempt === maxRetries - 1) {
        logger.error(`[Retry] Failed after ${attempt + 1} attempts`, { error: error.message, statusCode });
        throw error;
      }

      // Calculate delay with exponential backoff + jitter
      const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      const jitter = Math.random() * 0.3 * exponentialDelay; // ±30% jitter
      const delay = exponentialDelay + jitter;

      logger.warn(`[Retry] Attempt ${attempt + 1}/${maxRetries} failed with ${statusCode}. Retrying in ${Math.round(delay)}ms`);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Wrapper for API calls with timeout
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
}

// --- MAPOWANIE MODELI (Dla AI Studio) ---
const mapModel = (requested?: string): string => {
  const m = (requested || '').toLowerCase();
  // Aktualne modele Google AI Studio (2025)
  if (m.includes('pro')) return 'gemini-2.0-pro-exp';
  if (m.includes('flash')) return 'gemini-2.0-flash';
  return 'gemini-2.0-flash'; // Domyślny, stabilny model
};

// ===============================================
// ✅ REQUEST VALIDATION SCHEMAS
// ===============================================

// Text Generation Schema
const textGenerationSchema = z.object({
  model: z.string().max(100).optional(),
  contents: z.union([
    z.string().min(1).max(50000),
    z.array(z.any())
  ]),
  config: z.object({
    temperature: z.number().min(0).max(2).optional(),
    maxOutputTokens: z.number().min(1).max(8192).optional(),
    topP: z.number().min(0).max(1).optional(),
    topK: z.number().min(0).max(100).optional(),
    stopSequences: z.array(z.string()).optional(),
    systemInstruction: z.string().max(10000).optional()
  }).optional()
});

// Image Generation Schema
const imageGenerationSchema = z.object({
  prompt: z.string().min(1).max(4000),
  config: z.object({
    numberOfImages: z.number().min(1).max(1).optional(),
    outputMimeType: z.enum(['image/jpeg', 'image/png']).optional(),
    aspectRatio: z.enum(['1:1', '16:9', '9:16']).optional(),
    quality: z.enum(['standard', 'hd']).optional()
  }).optional()
});

// Video Generation Schema
const videoGenerationSchema = z.object({
  postText: z.string().min(1).max(5000),
  platform: z.string().min(1).max(50),
  style: z.string().max(100).optional(),
  prompt: z.string().max(4000).optional(),
  needsAudio: z.boolean().optional()
});

// Multi-Platform Optimizer Schema
const multiPlatformSchema = z.object({
  originalText: z.string().min(1).max(10000),
  targetPlatforms: z.array(z.string()).min(1).max(10),
  tone: z.string().max(100).optional(),
  hashtags: z.array(z.string()).max(30).optional()
});

// Validation Middleware Factory
function validateRequest(schema: z.ZodSchema) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const result = schema.safeParse(req.body);
    
    if (!result.success) {
      const errors = result.error.issues.map(issue => ({
        field: issue.path.join('.') || 'body',
        message: issue.message,
        code: issue.code
      }));
      
      logValidationError(req.path, errors, req.ip || 'unknown');
      
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors
      });
    }
    
    next();
  };
}

// --- ROUTES ---

// ===============================================
// 🏥 HEALTH CHECK ENDPOINT
// ===============================================
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    apis: {
      gemini: !!apiKey,
      openai: !!openai,
      luma: !!luma,
      replicate: !!replicate,
      supabase: !!supabase,
      costTracker: !!costTracker
    }
  });
});

app.get('/api/trends', (req, res) => {
    res.json({ trends: [] });
});

// ===============================================
// 🎨 CONTENT TEMPLATES & PRESETS
// ===============================================

// Get all templates
app.get('/api/templates', (req, res) => {
  try {
    res.json({ templates: CONTENT_TEMPLATES });
  } catch (error: any) {
    logger.error('Error fetching templates:', error);
    res.status(500).json({ message: 'Failed to fetch templates' });
  }
});

// Get templates by category
app.get('/api/templates/category/:category', (req, res) => {
  try {
    const { category } = req.params;
    const templates = getTemplatesByCategory(category);
    res.json({ templates });
  } catch (error: any) {
    logger.error('Error fetching templates by category:', error);
    res.status(500).json({ message: 'Failed to fetch templates' });
  }
});

// Get templates by platform
app.get('/api/templates/platform/:platform', (req, res) => {
  try {
    const { platform } = req.params;
    const templates = getTemplatesByPlatform(platform);
    res.json({ templates });
  } catch (error: any) {
    logger.error('Error fetching templates by platform:', error);
    res.status(500).json({ message: 'Failed to fetch templates' });
  }
});

// Apply template to content
app.post('/api/templates/apply', async (req, res) => {
  try {
    const { templateId, userInput } = req.body;
    const template = getTemplateById(templateId);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    const appliedTemplate = applyTemplate(template, userInput);
    res.json({ template: appliedTemplate });
  } catch (error: any) {
    logger.error('Error applying template:', error);
    res.status(500).json({ message: 'Failed to apply template' });
  }
});

// ===============================================
// 🔄 BATCH CONTENT GENERATION
// ===============================================

app.post('/api/generate-batch', textLimiter, async (req, res) => {
  try {
    const { topic, platforms, style = 'Professional', tone = 'Casual' } = req.body;
    const userId = req.headers['x-user-id'] as string || 'anon';
    
    if (!topic || !platforms || !Array.isArray(platforms)) {
      return res.status(400).json({ message: 'Missing topic or platforms array' });
    }
    
    logger.info(`[Batch Generation] User: ${userId}, Topic: ${topic}, Platforms: ${platforms.join(', ')}`);
    
    // Generate content for multiple platforms in parallel
    const batchPromises = platforms.map(async (platform: string) => {
      try {
        // Get template for platform
        const platformTemplates = getTemplatesByPlatform(platform);
        const template = platformTemplates[0]; // Use first matching template
        
        if (!template) {
          logger.warn(`No template found for platform: ${platform}`);
          return null;
        }
        
        // Generate content using Gemini
        const prompt = `Create social media content for ${platform}.
Topic: ${topic}
Tone: ${template.tone}
Style: ${template.style}
Platform: ${platform}

Requirements:
- Engaging ${template.tone.toLowerCase()} tone
- Optimized for ${platform}
- Include ${template.includeHashtags ? `${template.hashtagCount} relevant hashtags` : 'no hashtags'}
- Keep it concise and impactful

Output format:
TITLE: [Catchy title]
DESCRIPTION: [Main content]
${template.includeHashtags ? 'HASHTAGS: [Space-separated hashtags]' : ''}`;

        const genModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await genModel.generateContent(prompt);
        const text = result.response.text();
        
        // Parse response
        const titleMatch = text.match(/TITLE:\s*(.+)/);
        const descMatch = text.match(/DESCRIPTION:\s*([\s\S]+?)(?=HASHTAGS:|$)/);
        const hashtagsMatch = text.match(/HASHTAGS:\s*(.+)/);
        
        return {
          platform,
          template: template.name,
          title: titleMatch ? titleMatch[1].trim() : '',
          description: descMatch ? descMatch[1].trim() : text,
          hashtags: hashtagsMatch ? hashtagsMatch[1].trim() : '',
          aspectRatio: template.aspectRatio,
          config: {
            tone: template.tone,
            style: template.style,
            includeMusic: template.includeMusic,
            videoLength: template.videoLength
          }
        };
      } catch (error: any) {
        logger.error(`Error generating for ${platform}:`, error);
        return null;
      }
    });
    
    const results = await Promise.all(batchPromises);
    const successful = results.filter(r => r !== null);
    
    // Log cost
    await logCost(userId, 'batch_generation', successful.length * COST_ESTIMATES.TEXT, {
      platforms: platforms.length,
      successful: successful.length
    });
    
    res.json({
      count: successful.length,
      results: successful,
      topic
    });
    
  } catch (error: any) {
    logger.error('Batch generation error:', error);
    res.status(500).json({ message: error.message || 'Batch generation failed' });
  }
});

// ✅ GENEROWANIE TEKSTU (AI Studio) - with text limiter + validation
app.post('/api/generate-content', textLimiter, validateRequest(textGenerationSchema), async (req, res) => {
  try {
    const { model = 'gemini-2.0-flash', contents, config } = req.body || {};
    const modelName = mapModel(model);
    
    // Pobieramy model
    const genModel = genAI.getGenerativeModel({ 
        model: modelName,
        systemInstruction: config?.systemInstruction 
    });

    const generationConfig = {
        temperature: config?.temperature,
        maxOutputTokens: config?.maxOutputTokens,
        topP: config?.topP,
        topK: config?.topK,
        stopSequences: config?.stopSequences,
    };
    
    // Dostosowanie formatu 'contents'
    // AI Studio oczekuje formatu:Parts[], jeśli to prosty string, konwertujemy
    let finalContents = contents;
    if (typeof contents === 'string') {
        finalContents = [{ role: 'user', parts: [{ text: contents }] }];
    }

    // Wrap in retry logic with 30s timeout
    const result = await retryWithBackoff(
      () => withTimeout(
        genModel.generateContent({
          contents: finalContents,
          generationConfig: generationConfig
        }),
        30000, // 30s timeout
        'Text generation timed out'
      ),
      { maxRetries: 3, baseDelay: 1000 }
    );

    const response = await result.response;
    const text = response.text();
    
    res.json({ text });

  } catch (error: any) {
    console.error('Error in /api/generate-content:', error);
    res.status(500).json({ message: error.message || 'Generation failed', details: error.toString() });
  }
});

// ✅ STREAMING (AI Studio) - with text limiter + validation
app.post('/api/generate-content-stream', textLimiter, validateRequest(textGenerationSchema), async (req, res) => {
  try {
    const { model = 'gemini-2.0-flash', contents, config } = req.body || {};
    const modelName = mapModel(model);

    const genModel = genAI.getGenerativeModel({ 
        model: modelName,
        systemInstruction: config?.systemInstruction
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let contentArray = contents;
    if (typeof contents === 'string') {
      contentArray = [{ role: 'user', parts: [{ text: contents }] }];
    }

    // Streaming with timeout (no retry for streams)
    const result = await withTimeout(
      genModel.generateContentStream({
        contents: contentArray,
        generationConfig: {
            temperature: config?.temperature,
            maxOutputTokens: config?.maxOutputTokens,
        }
      }),
      45000, // 45s timeout for streaming
      'Streaming timed out'
    );

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
      }
    }
    res.write(`data: ${JSON.stringify({ event: 'done' })}\n\n`);
    res.end();

  } catch (error: any) {
    console.error('Error in /api/generate-content-stream:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

// ✅ CHAT (AI Studio) - with text limiter
app.post('/api/generate', textLimiter, async (req, res) => {
  try {
    const { prompt, history, model = 'gemini-2.0-flash' } = req.body;
    const modelName = mapModel(model);
    
    const genModel = genAI.getGenerativeModel({ model: modelName });

    const chat = genModel.startChat({
        history: history || [],
    });

    const result = await chat.sendMessageStream(prompt);

    res.setHeader('Content-Type', 'text/plain');
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      res.write(chunkText);
    }
    res.end();

  } catch (error: any) {
    console.error('Error in /api/generate:', error);
    res.status(500).json({ error: error.message });
  }
});


// --- GENEROWANIE OBRAZÓW (DALL-E) --- with expensive limiter + validation
app.post('/api/generate-images', expensiveLimiter, validateRequest(imageGenerationSchema), async (req, res) => {
  try {
    const { prompt, config } = req.body; // Already validated by middleware
    const userId = req.header('x-user-id') || 'unknown';

    if (!openai) {
      logger.error('[DALL-E] API key not configured');
      return res.status(503).json({ message: 'Image generation unavailable - OpenAI API key not configured' });
    }

    const startTime = Date.now();
    logger.info('[DALL-E] Starting image generation', { 
      userId, 
      promptLength: prompt.length,
      aspectRatio: config?.aspectRatio || '1:1'
    });

    // Parametry dla DALL-E 3
    const size = config?.aspectRatio === '16:9' ? '1792x1024' : 
                 config?.aspectRatio === '9:16' ? '1024x1792' : 
                 '1024x1024';
    const quality = config?.quality || 'standard'; // 'standard' lub 'hd'
    const numberOfImages = 1; // DALL-E 3 generuje tylko 1 obraz na raz

    // Generowanie obrazu przez DALL-E 3 with retry
    const response = await retryWithBackoff(
      () => withTimeout(
        openai.images.generate({
          model: 'dall-e-3',
          prompt: prompt,
          n: numberOfImages,
          size: size as '1024x1024' | '1792x1024' | '1024x1792',
          quality: quality as 'standard' | 'hd',
          response_format: 'url',
        }),
        60000, // 60s timeout for DALL-E
        'DALL-E generation timed out'
      ),
      { maxRetries: 2, baseDelay: 2000 } // DALL-E is expensive, only 2 retries
    );

    const imageUrl = response.data[0]?.url;
    if (!imageUrl) {
      throw new Error('No image URL returned from DALL-E');
    }

    // Pobieramy obraz i zapisujemy w Supabase with retry
    const downloadResponse = await retryWithBackoff(
      () => withTimeout(
        axios.get(imageUrl, { responseType: 'arraybuffer' }),
        30000,
        'Image download timed out'
      ),
      { maxRetries: 3, baseDelay: 1000 }
    );
    const buffer = Buffer.from(downloadResponse.data);
    
    const fileName = `generated_images/dalle_${userId}_${Date.now()}.png`;
    
    // Upload to Supabase with retry
    await retryWithBackoff(
      async () => {
        const { error: uploadError } = await supabase.storage
          .from('generated_content')
          .upload(fileName, buffer, { contentType: 'image/png', upsert: true });
        
        if (uploadError) {
          console.error('[Supabase] Upload error:', uploadError);
          throw uploadError;
        }
      },
      { maxRetries: 3, baseDelay: 1000 }
    );

    const { data: pub } = supabase.storage.from('generated_content').getPublicUrl(fileName);

    const duration = Date.now() - startTime;
    const estimatedCost = quality === 'hd' ? COST_ESTIMATES['dalle-hd'] : COST_ESTIMATES['dalle-standard'];
    
    logAPICall('DALL-E', 'generate-images', duration, true);
    logCost(userId, 'image-generation', estimatedCost, 'DALL-E');
    
    // Track cost in database
    if (costTracker) {
      await costTracker.trackCost({
        userId,
        operation: 'image-generation',
        provider: 'DALL-E',
        cost: estimatedCost,
        durationMs: duration,
        success: true,
        metadata: { size, quality }
      });
    }
    
    logger.info('[DALL-E] Image generated successfully', {
      userId,
      duration: `${duration}ms`,
      size,
      quality,
      cost: `$${estimatedCost}`
    });

    // Zwracamy w formacie zgodnym z frontendem
    res.json({ 
        generatedImages: [{ image: { mimeType: 'image/png' } }],
        publicUrls: [pub.publicUrl],
        revisedPrompt: response.data[0]?.revised_prompt || prompt
    });

  } catch (error: any) {
    logger.error('[DALL-E] Generation failed', {
      error: error.message,
      stack: error.stack,
      userId: req.header('x-user-id') || 'unknown'
    });
    const errorMessage = error.response?.data?.error?.message || error.message || 'Image generation failed';
    res.status(500).json({ message: errorMessage });
  }
});


// 🎬 SMART VIDEO ROUTER (Luma vs Replicate) - with expensive limiter + validation
app.post('/api/generate-video-story', expensiveLimiter, validateRequest(videoGenerationSchema), async (req, res) => {
  try {
    const { postText, platform, style, prompt, needsAudio = false } = req.body;
    const userId = req.header('x-user-id') || 'unknown';

    // 1. ANALIZA FORMATU (Pion vs Poziom)
    const isVertical = ['TikTok', 'Instagram', 'YouTube Shorts', 'Reels'].includes(platform);
    
    logger.info('[Smart Router] Video generation request', {
      platform,
      isVertical,
      needsAudio,
      userId
    });

    // 2. LOGIKA WYBORU GENERATORA
    let provider = '';
    
    // ZASADA 1: Format PIONOWY -> Luma (Replicate Zeroscope nie radzi sobie z 9:16)
    if (isVertical) {
      provider = 'luma';
      console.log('👉 Decision: LUMA (Reason: Vertical format 9:16 required)');
    } 
    // ZASADA 2: Wymagany DŹWIĘK lub Premium -> Luma
    else if (needsAudio) {
      provider = 'luma';
      console.log('👉 Decision: LUMA (Reason: Audio/Premium required)');
    } 
    // ZASADA 3: Poziomo + Bez dźwięku -> Tani Replicate
    else {
      provider = 'replicate';
      console.log('👉 Decision: REPLICATE (Reason: Horizontal, no audio - cost-effective)');
    }

    // ======================================================
    // ŚCIEŻKA A: LUMA DREAM MACHINE (Premium / Pion / Audio)
    // Koszt: ~$0.40 per video
    // ======================================================
    if (provider === 'luma') {
      if (!luma) {
        return res.status(503).json({ message: 'Luma API key not configured' });
      }

      // Gemini tworzy prompt wizualny with retry
      const genModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const promptResp = await retryWithBackoff(
        () => withTimeout(
          genModel.generateContent(`
            Create a visual prompt for Luma Dream Machine based on: "${postText}".
            Style: ${style || 'cinematic'}.
            Format: ${isVertical ? 'Vertical 9:16' : 'Cinematic 16:9'}.
            Output ONLY the prompt in English (max 40 words).
          `),
          20000,
          'Prompt generation timed out'
        ),
        { maxRetries: 2 }
      );
      const visualPrompt = prompt || promptResp.response.text().trim();

      const lumaStartTime = Date.now();
      logger.info('[Luma] Starting video generation', {
        userId,
        promptLength: visualPrompt.length,
        aspectRatio: isVertical ? '9:16' : '16:9'
      });

      // Create Luma generation with retry
      const generation = await retryWithBackoff(
        () => withTimeout(
          luma.generations.create({
            prompt: visualPrompt,
            aspectRatio: (isVertical ? '9:16' : '16:9') as '16:9' | '9:16',
            loop: false,
          }),
          30000,
          'Luma API request timed out'
        ),
        { maxRetries: 2, baseDelay: 2000 }
      );

      // Polling with retry on status checks
      let completed = false;
      let attempts = 0;
      while (attempts < 60) {
        await sleep(3000);
        
        const status = await retryWithBackoff(
          () => luma.generations.get(generation.id),
          { maxRetries: 2, baseDelay: 500 }
        );
        
        if (status.state === 'completed') {
          completed = true;
          const videoUrl = status.assets?.video;
          
          if (!videoUrl) throw new Error('No video URL from Luma');

          // Download video with retry
          const vidRes = await retryWithBackoff(
            () => withTimeout(
              axios.get(videoUrl, { responseType: 'arraybuffer' }),
              60000,
              'Video download timed out'
            ),
            { maxRetries: 3, baseDelay: 2000 }
          );
          const fileName = `generated_videos/${userId}_luma_${Date.now()}.mp4`;
          
          // Upload with retry
          await retryWithBackoff(
            async () => {
              const { error } = await supabase.storage.from('generated_content')
                .upload(fileName, Buffer.from(vidRes.data), { contentType: 'video/mp4', upsert: true });
              if (error) throw error;
            },
            { maxRetries: 3, baseDelay: 1000 }
          );
          
          const { data } = supabase.storage.from('generated_content').getPublicUrl(fileName);

          const lumaDuration = Date.now() - lumaStartTime;
          const lumaCost = COST_ESTIMATES['luma-video'];
          
          logAPICall('Luma', 'generate-video', lumaDuration, true);
          logCost(userId, 'video-generation', lumaCost, 'Luma');
          
          // Track cost in database
          if (costTracker) {
            await costTracker.trackCost({
              userId,
              operation: 'video-generation',
              provider: 'Luma',
              cost: lumaCost,
              durationMs: lumaDuration,
              success: true,
              metadata: { aspectRatio: isVertical ? '9:16' : '16:9' }
            });
          }
          
          logger.info('[Luma] Video generated successfully', {
            userId,
            duration: `${lumaDuration}ms`,
            cost: `$${lumaCost}`
          });

          return res.json({
            url: data.publicUrl,
            videoUrl: data.publicUrl,
            thumbnail: status.assets?.thumbnail || '',
            provider: 'Luma AI (Premium)',
            cost_tier: 'high',
            duration: 5,
            prompt: visualPrompt
          });
        } else if (status.state === 'failed') {
          throw new Error(`Luma failed: ${status.failure_reason}`);
        }
        
        attempts++;
        console.log(`[Luma] Status: ${status.state} (${attempts}/60)`);
      }

      throw new Error('Luma timeout');
    }

    // ======================================================
    // ŚCIEŻKA B: REPLICATE ZEROSCOPE (Budget / Poziom)
    // Koszt: ~$0.02 per video
    // ======================================================
    if (provider === 'replicate') {
      if (!replicate) {
        return res.status(503).json({ message: 'Replicate API token not configured' });
      }

      // Gemini tworzy prompt dla Zeroscope with retry
      const genModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const promptResp = await retryWithBackoff(
        () => withTimeout(
          genModel.generateContent(`
            Create a visual prompt for Zeroscope AI (background video) based on: "${postText}".
            Style: ${style || 'modern'}.
            Rules: NO TEXT, focused on scenery/background. English only.
            Output ONLY the prompt.
          `),
          20000,
          'Prompt generation timed out'
        ),
        { maxRetries: 2 }
      );
      const visualPrompt = prompt || promptResp.response.text().trim();

      const replicateStartTime = Date.now();
      logger.info('[Replicate] Starting video generation', {
        userId,
        promptLength: visualPrompt.length
      });

      // Replicate API call with retry (can take 60-90 seconds)
      const output = await retryWithBackoff(
        () => withTimeout(
          replicate.run(
            "anotherjesse/zeroscope-v2-xl:9f747673945c62801b13b84701c783929c0ee784e4748ec062204894dda1a351",
            {
              input: {
                prompt: visualPrompt,
                num_frames: 24,
                width: 1024,
                height: 576,
                fps: 24,
                negative_prompt: "text, watermark, bad quality, distortion"
              }
            }
          ),
          120000, // 120s timeout for Replicate
          'Replicate video generation timed out'
        ),
        { maxRetries: 2, baseDelay: 3000 }
      );

      const videoUrl = Array.isArray(output) ? output[0] : String(output);
      
      // Download with retry
      const vidRes = await retryWithBackoff(
        () => withTimeout(
          axios.get(videoUrl, { responseType: 'arraybuffer' }),
          60000,
          'Video download timed out'
        ),
        { maxRetries: 3, baseDelay: 2000 }
      );
      const fileName = `generated_videos/${userId}_replicate_${Date.now()}.mp4`;
      
      // Upload with retry
      await retryWithBackoff(
        async () => {
          const { error } = await supabase.storage.from('generated_content')
            .upload(fileName, Buffer.from(vidRes.data), { contentType: 'video/mp4', upsert: true });
          if (error) throw error;
        },
        { maxRetries: 3, baseDelay: 1000 }
      );
      
      const { data } = supabase.storage.from('generated_content').getPublicUrl(fileName);

      const replicateDuration = Date.now() - replicateStartTime;
      const replicateCost = COST_ESTIMATES['replicate-video'];
      
      logAPICall('Replicate', 'generate-video', replicateDuration, true);
      logCost(userId, 'video-generation', replicateCost, 'Replicate');
      
      // Track cost in database
      if (costTracker) {
        await costTracker.trackCost({
          userId,
          operation: 'video-generation',
          provider: 'Replicate',
          cost: replicateCost,
          durationMs: replicateDuration,
          success: true,
          metadata: { format: '16:9' }
        });
      }
      
      logger.info('[Replicate] Video generated successfully', {
        userId,
        duration: `${replicateDuration}ms`,
        cost: `$${replicateCost}`
      });

      return res.json({
        url: data.publicUrl,
        videoUrl: data.publicUrl,
        thumbnail: '',
        provider: 'Replicate (Standard)',
        cost_tier: 'low',
        duration: 3,
        prompt: visualPrompt
      });
    }

  } catch (error: any) {
    logger.error('[Smart Video Router] Generation failed', {
      error: error.message,
      stack: error.stack,
      userId: req.header('x-user-id') || 'unknown',
      platform: req.body.platform
    });
    res.status(500).json({ message: error.message || 'Video generation failed' });
  }
});

// 🚀 Multi-Platform Optimizer (Poprawiony pod API Key) - with text limiter + validation
app.post('/api/optimize-multi-platform', textLimiter, validateRequest(multiPlatformSchema), async (req, res) => {
  try {
    const { originalText, targetPlatforms, tone, hashtags = [] } = req.body; // Already validated

    const optimizations = [];

    for (const platform of targetPlatforms) {
      const systemPrompt = `You are a social media expert. Optimize this post for ${platform} (Tone: ${tone}).
      Original: "${originalText}"
      Return ONLY valid JSON: { "text": "...", "hashtags": [], "tips": [] }`;

      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent(systemPrompt);
        const response = await result.response;
        let text = response.text().trim();
        
        // Czyszczenie markdown JSON
        text = text.replace(/```json/g, '').replace(/```/g, '');
        
        const aiResult = JSON.parse(text);

        optimizations.push({
          platform,
          text: aiResult.text,
          hashtags: aiResult.hashtags || [],
          characterCount: aiResult.text.length,
          tips: aiResult.tips || [],
          engagement: { score: 85, prediction: "Wysoki potencjał (AI Studio)" }
        });

      } catch (e) {
        console.error(`Optimization failed for ${platform}`, e);
      }
    }

    res.json(optimizations);

  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// 🧪 A/B Test Variants - with text limiter
app.post('/api/generate-ab-variants', textLimiter, async (req, res) => {
  try {
    const { originalText, platform, tone } = req.body;
    const systemPrompt = `Create A/B variants for ${platform} (${tone}). Original: "${originalText}". Return JSON: { "variantA": "...", "variantB": "..." }`;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(systemPrompt);
    const text = result.response.text().replace(/```json/g, '').replace(/```/g, '');
    
    res.json(JSON.parse(text));

  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ===============================================
// 📊 RATE LIMIT STATUS ENDPOINT
// ===============================================
app.get('/api/rate-limit-status', (req, res) => {
  const userId = req.header('x-user-id') || req.ip || 'anonymous';
  
  const rateLimitInfo = {
    userId: userId,
    limits: {
      general: {
        window: '15 minutes',
        max: 100,
        description: 'All API endpoints'
      },
      text: {
        window: '5 minutes',
        max: 50,
        description: 'Text generation endpoints'
      },
      expensive: {
        window: '1 hour',
        max: 20,
        description: 'Image and video generation'
      }
    },
    note: 'Rate limit headers are included in each API response'
  };
  
  res.json(rateLimitInfo);
});

// ===============================================
// 💰 COST TRACKING ENDPOINTS
// ===============================================

// Get user costs
app.get('/api/costs/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const days = parseInt(req.query.days as string) || 30;

    if (!costTracker) {
      return res.status(503).json({ message: 'Cost tracking not available' });
    }

    const costs = await costTracker.getUserCosts(userId, days);
    res.json(costs);
  } catch (error: any) {
    logger.error('[API] Failed to get user costs', { error: error.message });
    res.status(500).json({ message: error.message });
  }
});

// Get daily costs summary
app.get('/api/costs/daily', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;

    if (!costTracker) {
      return res.status(503).json({ message: 'Cost tracking not available' });
    }

    const costs = await costTracker.getDailyCosts(days);
    res.json(costs);
  } catch (error: any) {
    logger.error('[API] Failed to get daily costs', { error: error.message });
    res.status(500).json({ message: error.message });
  }
});

// Get top spenders
app.get('/api/costs/top-spenders', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const days = parseInt(req.query.days as string) || 30;

    if (!costTracker) {
      return res.status(503).json({ message: 'Cost tracking not available' });
    }

    const spenders = await costTracker.getTopSpenders(limit, days);
    res.json(spenders);
  } catch (error: any) {
    logger.error('[API] Failed to get top spenders', { error: error.message });
    res.status(500).json({ message: error.message });
  }
});

// Check user budget
app.get('/api/costs/check-budget/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const dailyBudget = parseFloat(req.query.budget as string) || 10.0;

    if (!costTracker) {
      return res.status(503).json({ message: 'Cost tracking not available' });
    }

    const budgetCheck = await costTracker.checkBudget(userId, dailyBudget);
    res.json(budgetCheck);
  } catch (error: any) {
    logger.error('[API] Failed to check budget', { error: error.message });
    res.status(500).json({ message: error.message });
  }
});

// ===============================================
// 🎯 CONTENT QUALITY SCORING ENDPOINT
// ===============================================
app.post('/api/score-content', async (req, res) => {
  logRequest(req);
  
  try {
    const { content, platform, context } = req.body;
    const userId = req.headers['x-user-id'] as string || 'anon';

    // Walidacja
    if (!content || !platform) {
      return res.status(400).json({ error: 'Content and platform are required' });
    }

    // Quick validation
    const validation = quickValidate(content, platform);
    if (!validation.isValid) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        issues: validation.errors 
      });
    }

    logger.info(`[Content Scoring] User: ${userId}, Platform: ${platform}`);

    // Scoring
    const score = await scoreContent(content, platform, context);

    logCost(userId, 'content-scoring', 0.001); // Minimalny koszt

    res.json({
      success: true,
      score,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('[Content Scoring] Error:', error);
    res.status(500).json({ 
      error: 'Scoring failed', 
      message: error.message 
    });
  }
});

// ===============================================
// 🏆 BENCHMARK COMPARISON ENDPOINT (Optional)
// ===============================================
app.post('/api/benchmark-content', async (req, res) => {
  logRequest(req);
  
  try {
    const { content, platform, niche } = req.body;
    const userId = req.headers['x-user-id'] as string || 'anon';

    if (!content || !platform || !niche) {
      return res.status(400).json({ 
        error: 'Content, platform, and niche are required' 
      });
    }

    logger.info(`[Benchmark] User: ${userId}, Niche: ${niche}`);

    const benchmark = await compareWithBenchmark(content, platform, niche);

    res.json({
      success: true,
      benchmark,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('[Benchmark] Error:', error);
    res.status(500).json({ 
      error: 'Benchmark failed', 
      message: error.message 
    });
  }
});

// PŁATNOŚCI (Placeholder)
// import paymentsRouter from './routes/payments.js';
// app.use('/api/payments', paymentsRouter);

// ===============================================
// 🚫 404 HANDLER
// ===============================================
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} does not exist`,
    availableEndpoints: [
      'GET /health',
      'GET /api/trends',
      'POST /api/generate-content',
      'POST /api/generate-content-stream',
      'POST /api/generate-images',
      'POST /api/generate-video-story',
      'POST /api/optimize-multi-platform',
      'POST /api/score-content',
      'POST /api/benchmark-content',
      'GET /api/costs/user/:userId',
      'GET /api/costs/daily',
      'GET /api/costs/top-spenders',
      'GET /api/rate-limit-status'
    ]
  });
});

app.listen(port, () => {
  logger.info('🚀 Server started successfully', {
    port,
    mode: 'AI Studio API Key',
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    apis: {
      gemini: !!apiKey,
      openai: !!openai,
      luma: !!luma,
      replicate: !!replicate
    }
  });
  console.log(`[server] Server running on http://localhost:${port}`);
});