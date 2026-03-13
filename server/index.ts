import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit, { RateLimitExceededEventHandler } from 'express-rate-limit';
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
import {
  LinkedInPublisher,
  TwitterPublisher,
  FacebookPublisher,
  InstagramPublisher,
  TikTokPublisher
} from './socialPublishing.js';
import { syncUserSocialPosts } from './socialSync.js';

// --- Rozwiązanie dla __dirname w ES Modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ładujemy .env
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Honor X-Forwarded-For when behind a proxy/load balancer (Railway, Vercel, etc.)
app.set('trust proxy', 1);

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
const allowedOriginsEnv = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    try {
      if (allowedOriginsEnv.includes(origin)) return callback(null, true);

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

app.use(express.json({ limit: '50mb' })); // Zwiększony limit dla dużych payloadów (np. base64 images)

// ===============================================
// 🔒 RATE LIMITING CONFIGURATION
// ===============================================

const rateLimitKeyGenerator = (req: express.Request) => req.header('x-user-id') || req.ip;

const rateLimitHandler: RateLimitExceededEventHandler = (req, res, _next, options) => {
  logRateLimit(req.path, req.ip || 'unknown', req.header('x-user-id') || undefined);
  res.status(options.statusCode || 429).json({ message: options.message || 'Too many requests' });
};

// General API rate limit (applies to all endpoints unless overridden)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: rateLimitHandler,
  keyGenerator: rateLimitKeyGenerator
  // Uses default IP-based key generation (handles IPv4/IPv6 properly)
});

// Strict limiter for expensive operations (image/video generation)
const expensiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 generations per hour
  message: 'Generation limit reached. Please wait before creating more content.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: rateLimitKeyGenerator,
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
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: rateLimitKeyGenerator
});

// Stream limiter (protects long-lived SSE connections)
const streamLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  message: 'Too many streaming requests. Please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: rateLimitKeyGenerator
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

// --- HELPERY ANALITYCZNE (sloty publikacji) ---
type HeatmapCell = {
  weekday: number; // 0=Monday, 6=Sunday
  hour: number;    // 0-23
  samples: number;
  avgScore: number;
};

const getWeekdayHourInTz = (iso: string, tz: string) => {
  const d = new Date(iso);
  // Intl w Node 18+ wspiera timeZone, fallback do UTC przy błędzie
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'short',
      hour: '2-digit',
      hour12: false
    }).formatToParts(d);
    const wd = parts.find(p => p.type === 'weekday')?.value || 'Mon';
    const hourStr = parts.find(p => p.type === 'hour')?.value || '00';
    const weekdayMap: Record<string, number> = {
      Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6
    };
    return { weekday: weekdayMap[wd] ?? 0, hour: parseInt(hourStr, 10) || 0 };
  } catch {
    const fallback = new Date(iso);
    return { weekday: fallback.getUTCDay(), hour: fallback.getUTCHours() };
  }
};

const computeSlotScore = (metrics: any) => {
  const likes = Number(metrics?.likes || 0);
  const comments = Number(metrics?.comments || 0);
  const shares = Number(metrics?.shares || 0);
  const impressions = Number(metrics?.impressions || metrics?.views || 0);
  const interactions = likes + comments + shares;
  const engagement = impressions > 0 ? interactions / impressions : interactions;
  // lekka preferencja dla postów z realnym zasięgiem
  return engagement + Math.min(impressions, 5000) * 0.00002; // +0.1 max za 5k imp.
};

const computeEngagementSummary = (p: any) => {
  const impressions = Number(p.metrics?.impressions || p.metrics?.views || 0);
  const likes = Number(p.metrics?.likes || 0);
  const comments = Number(p.metrics?.comments || 0);
  const shares = Number(p.metrics?.shares || 0);
  const interactions = likes + comments + shares;
  const er = impressions > 0 ? interactions / impressions : 0;
  return { impressions, likes, comments, shares, interactions, engagementRate: er };
};

// Flaga blokująca scheduler po błędach uprawnień, aby nie floodować logów
let schedulerBlockedUntil: number | null = null;

// --- SCHEDULER HELPERY (wybór slotów publikacji) ---
type Slot = { weekday: number; hour: number; samples: number; avgScore: number };

async function fetchTopSlots(userId: string, timezone: string, limit: number = 5) {
  const { data: posts } = await supabase
    .from('social_posts')
    .select('published_at, metrics')
    .eq('user_id', userId)
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(500);

  if (!posts || posts.length === 0) return [];

  const buckets: Record<string, Slot> = {};
  for (const p of posts) {
    if (!p.published_at) continue;
    const { weekday, hour } = getWeekdayHourInTz(p.published_at, timezone);
    const key = `${weekday}-${hour}`;
    if (!buckets[key]) buckets[key] = { weekday, hour, samples: 0, avgScore: 0 };
    const score = computeSlotScore(p.metrics || {});
    const b = buckets[key];
    b.samples += 1;
    b.avgScore = ((b.avgScore * (b.samples - 1)) + score) / b.samples;
  }

  return Object.values(buckets)
    .filter(b => b.samples >= 2)
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, limit);
}

const nextOccurrenceForSlot = (slot: Slot, timezone: string, after: Date) => {
  // Construct next datetime in given timezone for weekday/hour strictly after "after"
  const result = new Date(after.getTime());
  for (let i = 0; i < 8; i++) {
    const candidate = new Date(result.getTime() + i * 24 * 60 * 60 * 1000);
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(candidate);
    const wdStr = parts.find(p => p.type === 'weekday')?.value || 'Mon';
    const weekdayMap: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
    const wd = weekdayMap[wdStr] ?? candidate.getUTCDay();
    if (wd !== slot.weekday) continue;

    // Build date string with desired hour in that timezone
    const mm = parts.find(p => p.type === 'month')?.value || '01';
    const dd = parts.find(p => p.type === 'day')?.value || '01';
    const yyyy = parts.find(p => p.type === 'year')?.value || '1970';
    const isoLocal = `${yyyy}-${mm}-${dd}T${String(slot.hour).padStart(2, '0')}:00:00`;
    const zoned = new Date(isoLocal + 'Z'); // temporary
    // Adjust to actual timezone offset by re-parsing
    const target = new Date(
      new Date(
        new Intl.DateTimeFormat('sv-SE', {
          timeZone: timezone,
          hour12: false,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }).format(zoned).replace(' ', 'T')
      ).getTime()
    );

    if (target > after) return target.toISOString();
  }
  return null;
};

// --- MAPOWANIE MODELI (Dla AI Studio) ---
const mapModel = (requested?: string): string => {
  const m = (requested || '').toLowerCase();
  // Prawidłowe nazwy modeli Google AI Studio
  if (m.includes('pro')) return 'gemini-pro-latest';
  if (m.includes('lite')) return 'gemini-flash-lite-latest';
  if (m.includes('flash')) return 'gemini-flash-latest';
  return 'gemini-flash-latest'; // Domyślny model
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
// 🔗 SOCIAL MEDIA INTEGRATIONS
// ===============================================

// LinkedIn config
const linkedInConfig = {
  clientId: process.env.LINKEDIN_CLIENT_ID || '',
  clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
  redirectUri: process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3001/api/social/callback/linkedin'
};

// Twitter config
const twitterConfig = {
  appKey: process.env.TWITTER_APP_KEY || '',
  appSecret: process.env.TWITTER_APP_SECRET || '',
  callbackUrl: process.env.TWITTER_CALLBACK_URL || 'http://localhost:3001/api/social/callback/twitter'
};

// Facebook/IG config
const facebookConfig = {
  appId: process.env.FACEBOOK_APP_ID || '',
  appSecret: process.env.FACEBOOK_APP_SECRET || '',
  redirectUri: process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:3001/api/social/callback/facebook'
};

// TikTok config
const tiktokConfig = {
  clientKey: process.env.TIKTOK_CLIENT_KEY || '',
  clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
  redirectUri: process.env.TIKTOK_REDIRECT_URI || 'http://localhost:3001/api/social/callback/tiktok'
};

// Social Auth URL
app.get('/api/social/auth/:platform', async (req, res) => {
  const { platform } = req.params;
  const userId = req.headers['x-user-id'] as string;

  if (!userId) {
    return res.status(401).json({ error: 'User ID is required' });
  }

  try {
    let authUrl = '';

    switch (platform) {
      case 'linkedin':
        const linkedIn = new LinkedInPublisher(linkedInConfig);
        authUrl = await linkedIn.getAuthUrl(); // LinkedIn w tym kodzie ma własny randomowy state. Tutaj możnaby kiedyś dokleić userId.
        break;
      case 'twitter':
        const twitterAuth = await TwitterPublisher.getAuthUrl(
          twitterConfig.appKey,
          twitterConfig.appSecret,
          twitterConfig.callbackUrl
        );
        authUrl = twitterAuth.url;
        break;
      case 'facebook':
        authUrl = FacebookPublisher.getAuthUrl(facebookConfig.appId, facebookConfig.redirectUri, userId, false);
        break;
      case 'instagram':
        authUrl = FacebookPublisher.getAuthUrl(facebookConfig.appId, facebookConfig.redirectUri, userId, true);
        break;
      case 'tiktok':
        authUrl = TikTokPublisher.getAuthUrl(tiktokConfig.clientKey, tiktokConfig.redirectUri);
        break;
      default:
        return res.status(400).json({ error: 'Unsupported platform' });
    }

    res.json({ authUrl });
  } catch (error: any) {
    logger.error(`Social auth error (${platform}):`, error);
    res.status(500).json({ error: error.message });
  }
});

// Zapis połączenia (Callback OAuth API) - działa jako GET z redirect
app.get('/api/social/callback/:platform', async (req, res) => {
  const { platform } = req.params;
  const { code, state, oauth_token, oauth_verifier } = req.query;

  // W naszym flow używamy 'state' do przeniesienia userId
  const userId = state as string;

  if (!userId) {
    return res.status(401).send('User ID is required in state parameter');
  }

  try {
    let connectionData: any = {};

    switch (platform) {
      case 'linkedin':
        if (!code) throw new Error('Nieotrzymano kodu autoryzacji (LinkedIn)');
        const liTokens = await new LinkedInPublisher(linkedInConfig).exchangeCodeForToken(code as string);
        const liProfile = await new LinkedInPublisher(linkedInConfig).getUserProfile(liTokens.accessToken);
        connectionData = {
          access_token: liTokens.accessToken,
          account_id: liProfile.id,
          account_name: liProfile.name,
          account_handle: liProfile.name,
          avatar_url: liProfile.profilePicture,
          expires_in: liTokens.expiresIn
        };
        break;

      case 'facebook':
        if (!code) throw new Error('Nieotrzymano kodu autoryzacji (Facebook)');
        const fbTokens = await FacebookPublisher.exchangeCodeForToken(
          facebookConfig.appId,
          facebookConfig.appSecret,
          code as string,
          facebookConfig.redirectUri
        );
        const fbPublisher = new FacebookPublisher(fbTokens.accessToken);
        const fbPages = await fbPublisher.getPages();

        if (fbPages.length === 0) {
          throw new Error('Nie znaleziono żadnej strony Facebook, którą zarządzasz. Strona jest wymagana do publikacji.');
        }

        // Automatycznie wybieramy pierwszą stronę
        const firstPage = fbPages[0];

        connectionData = {
          access_token: firstPage.accessToken, // Zapisujemy Page Access Token
          account_id: firstPage.id,           // Zapisujemy Page ID
          account_name: firstPage.name,
          account_handle: firstPage.name,
          avatar_url: `https://graph.facebook.com/${firstPage.id}/picture`
        };
        break;

      case 'instagram':
        if (!code) throw new Error('Nieotrzymano kodu autoryzacji (Instagram)');
        const igTokens = await FacebookPublisher.exchangeCodeForToken(
          facebookConfig.appId,
          facebookConfig.appSecret,
          code as string,
          facebookConfig.redirectUri
        );
        const igPublisher = new InstagramPublisher(igTokens.accessToken);
        const igAccount = await igPublisher.findFirstInstagramAccount();

        if (!igAccount) {
          throw new Error('Nie znaleziono konta Instagram Business powiązanego z Twoimi stronami Facebook.');
        }

        connectionData = {
          access_token: igAccount.pageAccessToken, // Dla IG używamy Page Tokena lub User Tokena, ale Page ID jest potrzebne do relacji
          account_id: igAccount.id,
          account_name: igAccount.username,
          account_handle: igAccount.username,
          avatar_url: `https://graph.facebook.com/${igAccount.id}/picture` // To może nie działać dla IG bezpośrednio, ale FB Proxy często pozwala
        };
        break;

      case 'twitter':
        if (!oauth_token || !oauth_verifier) throw new Error('Nieotrzymano poprawnych danych (Twitter)');
        const twTokens = await TwitterPublisher.exchangeForAccessToken(
          twitterConfig.appKey,
          twitterConfig.appSecret,
          oauth_token as string,
          twitterConfig.appSecret,
          oauth_verifier as string
        );
        connectionData = {
          access_token: twTokens.accessToken,
          refresh_token: twTokens.accessSecret,
          account_id: twTokens.userId,
          account_name: twTokens.screenName,
          account_handle: twTokens.screenName
        };
        break;

      case 'tiktok':
        if (!code) throw new Error('Nieotrzymano kodu autoryzacji (TikTok)');
        const ttTokens = await new TikTokPublisher(tiktokConfig).exchangeCodeForToken(code as string);
        const ttProfile = await new TikTokPublisher(tiktokConfig).getUserProfile(ttTokens.accessToken);
        connectionData = {
          access_token: ttTokens.accessToken,
          refresh_token: ttTokens.refreshToken,
          account_id: ttProfile.id,
          account_name: ttProfile.name,
          avatar_url: ttProfile.avatar,
          expires_in: ttTokens.expiresIn
        };
        break;

      default:
        return res.status(400).send('Nieznana platforma społecznościowa: ' + platform);
    }

    // Zapiszmy tokeny w Supabase
    const { error } = await supabase
      .from('social_connections')
      .upsert({
        user_id: userId,
        platform,
        ...connectionData,
        is_active: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id, platform' });

    if (error) throw error;

    res.redirect(`http://localhost:3000/#/dashboard?socialSuccess=true&platform=${platform}`);
  } catch (error: any) {
    logger.error(`Social callback error (${platform}):`, error);
    res.redirect(`http://localhost:3000/#/dashboard?socialError=${encodeURIComponent(error.message)}`);
  }
});

const mapSocialPost = (p: any, platform: string, connectionId: string) => ({
  id: p.id,
  platformPostId: p.id,
  content: p.content || p.title || '',
  publishedAt: p.publishedAt,
  url: p.url,
  platform,
  connectionId,
  mediaUrl: p.mediaUrl,
  metrics: {
    likes: p.likes || 0,
    comments: p.comments || 0,
    shares: p.shares || 0,
    views: p.views || 0,
    reach: p.reach || 0,
    impressions: p.impressions || 0
  }
});

// Fetch historical posts for a connection
app.get('/api/social/history/:connectionId', async (req, res) => {
  const { connectionId } = req.params;
  const userId = req.headers['x-user-id'] as string;

  if (!userId) return res.status(401).json({ error: 'User ID required' });

  try {
    const { data: connection, error } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', userId)
      .single();

    if (error || !connection) return res.status(404).json({ error: 'Connection not found' });

    let posts: any[] = [];
    switch (connection.platform) {
      case 'linkedin':
        posts = await new LinkedInPublisher(linkedInConfig).getPosts(connection.access_token, connection.account_id);
        break;
      case 'twitter':
        posts = await new TwitterPublisher(twitterConfig.appKey, twitterConfig.appSecret, connection.access_token, connection.refresh_token || '').getPosts(connection.account_id);
        break;
      case 'facebook':
        posts = await new FacebookPublisher(connection.access_token).getPosts(connection.account_id, connection.access_token);
        break;
      case 'instagram':
        posts = await new InstagramPublisher(connection.access_token).getPosts(connection.account_id);
        break;
      case 'tiktok':
        posts = await new TikTokPublisher(tiktokConfig).getPosts(connection.access_token);
        break;
    }

    res.json({ posts: posts.map(p => mapSocialPost(p, connection.platform, connection.id)) });
  } catch (error: any) {
    logger.error('Fetch social history error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fetch historical posts from ALL active connections for a user (Aggregated)
app.get('/api/social/aggregate-history', async (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ error: 'User ID required' });

  try {
    const { data: connections, error } = await supabase
      .from('social_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    // Trigger background sync to keep database updated
    syncUserSocialPosts(userId).catch(err => logger.error('Background sync failed:', err));

    if (error) throw error;
    if (!connections || connections.length === 0) return res.json({ posts: [] });

    const allPostsPromises = connections.map(async (conn) => {
      try {
        let posts: any[] = [];
        switch (conn.platform) {
          case 'linkedin':
            posts = await new LinkedInPublisher(linkedInConfig).getPosts(conn.access_token, conn.account_id);
            break;
          case 'twitter':
            posts = await new TwitterPublisher(twitterConfig.appKey, twitterConfig.appSecret, conn.access_token, conn.refresh_token || '').getPosts(conn.account_id);
            break;
          case 'facebook':
            posts = await new FacebookPublisher(conn.access_token).getPosts(conn.account_id, conn.access_token);
            break;
          case 'instagram':
            posts = await new InstagramPublisher(conn.access_token).getPosts(conn.account_id);
            break;
          case 'tiktok':
            posts = await new TikTokPublisher(tiktokConfig).getPosts(conn.access_token);
            break;
        }
        return posts.map(p => mapSocialPost(p, conn.platform, conn.id));
      } catch (e) {
        logger.error(`Error fetching history for connection ${conn.id}:`, e);
        return [];
      }
    });

    const results = await Promise.all(allPostsPromises);
    const flattenedPosts = results.flat().sort((a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

    res.json({ posts: flattenedPosts });
  } catch (error: any) {
    logger.error('Fetch aggregate social history error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===============================================
// 🕒 BEST POSTING TIMES (HEATMAP)
// ===============================================
app.get('/api/social/best-times', async (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ error: 'User ID required' });

  const timezone = (req.headers['x-timezone'] as string) || 'UTC';
  const limit = Math.min(parseInt(req.query.limit as string) || 400, 1000);

  try {
    const { data: posts, error } = await supabase
      .from('social_posts')
      .select('published_at, platform, metrics')
      .eq('user_id', userId)
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    if (!posts || posts.length === 0) {
      return res.json({
        timezone,
        heatmap: [],
        topSlots: [],
        note: 'Brak danych historycznych – podepnij konta lub poczekaj na synchronizację.'
      });
    }

    const buckets: Record<string, HeatmapCell> = {};

    for (const p of posts) {
      if (!p.published_at) continue;
      const { weekday, hour } = getWeekdayHourInTz(p.published_at, timezone);
      const key = `${weekday}-${hour}`;
      if (!buckets[key]) {
        buckets[key] = { weekday, hour, samples: 0, avgScore: 0 };
      }
      const score = computeSlotScore(p.metrics || {});
      const b = buckets[key];
      b.samples += 1;
      b.avgScore = ((b.avgScore * (b.samples - 1)) + score) / b.samples;
    }

    const heatmap = Object.values(buckets).sort((a, b) => a.weekday - b.weekday || a.hour - b.hour);

    const topSlots = [...heatmap]
      .filter(h => h.samples >= 2) // minimalna wiarygodność
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 5);

    res.json({ timezone, samples: posts.length, heatmap, topSlots });
  } catch (error: any) {
    logger.error('[BestTimes] Failed to compute heatmap', { error: error.message, userId });
    res.status(500).json({ error: error.message });
  }
});

// ===============================================
// 📈 POST-MORTEM ANALYZA OPUBLIKOWANYCH POSTÓW
// ===============================================
const POST_MORTEM_CUTOFF_HOURS = 48;
const POST_MORTEM_BATCH = 8;

async function processPostMortems() {
  const cutoff = new Date(Date.now() - POST_MORTEM_CUTOFF_HOURS * 60 * 60 * 1000).toISOString();

  try {
    const { data: posts, error } = await supabase
      .from('social_posts')
      .select('id, user_id, platform, content, metrics, published_at, url')
      .is('ai_analysis', null)
      .lte('published_at', cutoff)
      .order('published_at', { ascending: false })
      .limit(POST_MORTEM_BATCH);

    if (error) throw error;
    if (!posts || posts.length === 0) return;

    // Group by user to keep context small and accurate
    const postsByUser = posts.reduce<Record<string, any[]>>((acc, p) => {
      if (!acc[p.user_id]) acc[p.user_id] = [];
      acc[p.user_id].push(p);
      return acc;
    }, {});

    for (const [userId, userPosts] of Object.entries(postsByUser)) {
      try {
        const summary = userPosts.map((p, idx) => {
          const m = computeEngagementSummary(p);
          return `[${idx + 1}] Platform: ${p.platform}, ER: ${(m.engagementRate * 100).toFixed(2)}%, ` +
            `Interakcje: ${m.interactions}, Wyświetlenia: ${m.impressions}, Treść: ${p.content?.slice(0, 220) || ''}`;
        }).join('\n');

        const prompt = `Jesteś analitykiem social media. Na podstawie metryk podsumuj skuteczność postów i daj konkretne rekomendacje na przyszłość.\n\nPosty:\n${summary}\n\nZwróć JSON:\n{\n  "topTakeaways": [\"...\"],\n  "improvementIdeas": [\"...\"],\n  "winnerIndex": number,\n  "reasonWinner": \"...\",\n  "nextSlotsHint": \"3 słowa o najlepszych godzinach jeśli znasz (opcjonalnie)\"\n}`;

        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const analysis = JSON.parse(response.text().replace(/```json|```/g, '').trim());

        // Persist per post (same analysis attached to each for simplicity)
        const ids = userPosts.map(p => p.id);
        await supabase.from('social_posts')
          .update({ ai_analysis: analysis, last_synced_at: new Date().toISOString() })
          .in('id', ids);

        logger.info('[PostMortem] Saved analysis', { userId, posts: ids.length });
      } catch (userErr: any) {
        logger.error('[PostMortem] User batch failed', { userId, error: userErr.message });
      }
    }
  } catch (e: any) {
    logger.error('[PostMortem] Fatal error', { error: e.message });
  }
}

// co 30 minut
setInterval(processPostMortems, 30 * 60 * 1000);

// Ręczny trigger post-mortem (dla QA / dashboardu)
app.post('/api/social/post-mortem', async (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ error: 'User ID required' });

  const { postIds, sinceHours = 48, forceRecalc = false, limit = 12 } = req.body || {};
  if ((!postIds || !Array.isArray(postIds) || postIds.length === 0) && !sinceHours) {
    return res.status(400).json({ error: 'Provide postIds array or sinceHours' });
  }

  try {
    const query = supabase
      .from('social_posts')
      .select('id, user_id, platform, content, metrics, published_at, url, ai_analysis')
      .eq('user_id', userId)
      .order('published_at', { ascending: false })
      .limit(Math.min(limit, 30));

    if (postIds && Array.isArray(postIds) && postIds.length > 0) {
      query.in('id', postIds);
    } else {
      const cutoff = new Date(Date.now() - Number(sinceHours) * 60 * 60 * 1000).toISOString();
      query.lte('published_at', cutoff);
    }

    if (!forceRecalc) query.is('ai_analysis', null);

    const { data: posts, error } = await query;
    if (error) throw error;
    if (!posts || posts.length === 0) {
      return res.json({ processed: 0, note: 'No posts to analyze' });
    }

    const summary = posts.map((p: any, idx: number) => {
      const m = computeEngagementSummary(p);
      return `[${idx + 1}] Platform: ${p.platform}, ER: ${(m.engagementRate * 100).toFixed(2)}%, ` +
        `Interakcje: ${m.interactions}, Wyświetlenia: ${m.impressions}, Treść: ${p.content?.slice(0, 220) || ''}`;
    }).join('\n');

    const prompt = `Jesteś analitykiem social media. Na podstawie metryk podsumuj skuteczność postów i daj konkretne rekomendacje na przyszłość.\n\nPosty:\n${summary}\n\nZwróć JSON:\n{\n  "topTakeaways": [\"...\"],\n  "improvementIdeas": [\"...\"],\n  "winnerIndex": number,\n  "reasonWinner": \"...\",\n  "nextSlotsHint": \"3 słowa o najlepszych godzinach jeśli znasz (opcjonalnie)\"\n}`;

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysis = JSON.parse(response.text().replace(/```json|```/g, '').trim());

    const ids = posts.map((p: any) => p.id);
    await supabase.from('social_posts')
      .update({ ai_analysis: analysis, last_synced_at: new Date().toISOString() })
      .in('id', ids);

    res.json({ processed: ids.length, analysis });
  } catch (error: any) {
    logger.error('[PostMortem] Manual run failed', { error: error.message, userId });
    res.status(500).json({ error: error.message });
  }
});

// Manual sync endpoint
app.post('/api/social/sync', async (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ error: 'Missing x-user-id header' });

  try {
    const result = await syncUserSocialPosts(userId);
    res.json(result);
  } catch (error: any) {
    logger.error('Sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 🚀 NOWY ENDPOINT: Publikacja posta (używany ręcznie lub przez automat)
 */
app.post('/api/social/publish', async (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  const { connectionId, postText, imageUrl, scheduledPostId } = req.body;

  if (!userId) return res.status(401).json({ error: 'Missing x-user-id header' });
  if (!connectionId || !postText) return res.status(400).json({ error: 'Missing connectionId or postText' });

  try {
    // 1. Pobierz dane połączenia
    const { data: connection, error: connError } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', userId)
      .single();

    if (connError || !connection) {
      throw new Error('Nie znaleziono aktywnego połączenia dla tej platformy.');
    }

    let publishResult;

    // 2. Publikuj na odpowiedniej platformie
    switch (connection.platform) {
      case 'facebook':
        const fb = new FacebookPublisher(connection.access_token);
        publishResult = await fb.publishPost(
          connection.account_id,
          connection.access_token,
          postText,
          imageUrl
        );
        break;

      case 'instagram':
        const ig = new InstagramPublisher(connection.access_token);
        // Instagram wymaga obrazka do publikacji przez API Content Publishing
        if (!imageUrl) throw new Error('Instagram wymaga obrazka do publikacji posta.');
        publishResult = await ig.publishPost(connection.account_id, imageUrl, postText);
        break;

      case 'twitter':
        const tw = new TwitterPublisher(
          process.env.TWITTER_APP_KEY || '',
          process.env.TWITTER_APP_SECRET || '',
          connection.access_token,
          connection.refresh_token || ''
        );
        let mediaIds: string[] = [];
        if (imageUrl) {
          const mediaId = await tw.uploadMedia(imageUrl);
          mediaIds.push(mediaId);
        }
        publishResult = await tw.publishTweet(postText, mediaIds);
        break;

      case 'linkedin':
        const li = new LinkedInPublisher({
          clientId: process.env.LINKEDIN_CLIENT_ID || '',
          clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
          redirectUri: process.env.LINKEDIN_REDIRECT_URI || ''
        });
        publishResult = await li.publishPost(connection.access_token, connection.account_id, postText, imageUrl);
        break;

      default:
        throw new Error(`Platforma ${connection.platform} nie jest jeszcze wspierana w bezpośredniej publikacji.`);
    }

    // 3. Jeśli to był post zaplanowany, zaktualizuj status
    if (scheduledPostId) {
      await supabase
        .from('scheduled_posts')
        .update({ status: 'published', published_url: publishResult.url })
        .eq('id', scheduledPostId);
    }

    // 4. Zapisz w historii
    await supabase.from('history').insert({
      user_id: userId,
      content: postText,
      platform: connection.platform,
      metadata: {
        published_url: publishResult.url,
        platform_id: publishResult.id,
        imageUrl,
        is_published: true
      }
    });

    res.json({ success: true, ...publishResult });
  } catch (error: any) {
    logger.error('Social publish error:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- AUTOMATYCZNY SCHEDULER ---
// Sprawdza posty do publikacji co minutę
async function processScheduledPosts() {
  const nowDate = new Date();
  const nowIso = nowDate.toISOString();

  if (schedulerBlockedUntil && Date.now() < schedulerBlockedUntil) {
    logger.warn('[Scheduler] Skipping run (previous permission error, backoff active)');
    return;
  }

  try {
    // 0. Auto-assign najlepsze sloty czasowe dla postów bez scheduled_at
    const { data: unscheduled } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('status', 'scheduled')
      .is('scheduled_at', null)
      .limit(100);

    const slotCache: Record<string, Slot[]> = {};

    if (unscheduled && unscheduled.length > 0) {
      for (const post of unscheduled) {
        try {
          const timezone = post.form_data?.timezone || post.form_data?.tz || 'UTC';
          const cacheKey = `${post.user_id}-${timezone}`;
          if (!slotCache[cacheKey]) {
            slotCache[cacheKey] = await fetchTopSlots(post.user_id, timezone, 5);
          }

          const slots = slotCache[cacheKey];
          let scheduledAt = null as string | null;

          if (slots && slots.length > 0) {
            for (const slot of slots) {
              const candidate = nextOccurrenceForSlot(slot, timezone, nowDate);
              if (candidate) {
                scheduledAt = candidate;
                break;
              }
            }
          }

          // Fallback: za 10 minut, aby nie blokować publikacji
          if (!scheduledAt) {
            scheduledAt = new Date(nowDate.getTime() + 10 * 60 * 1000).toISOString();
          }

          // Lekki jitter (+/- 3 min) by rozbić kolizje slotów
          const jitterMs = Math.floor((Math.random() * 6 - 3) * 60 * 1000); // -3..+3 min
          const jittered = new Date(new Date(scheduledAt).getTime() + jitterMs);
          // Nie pozwalamy cofnąć przed "teraz + 2 min" żeby uniknąć natychmiastowego triggera
          const minDate = new Date(nowDate.getTime() + 2 * 60 * 1000);
          const finalScheduled = jittered > minDate ? jittered : minDate;
          scheduledAt = finalScheduled.toISOString();

          await supabase
            .from('scheduled_posts')
            .update({ scheduled_at: scheduledAt })
            .eq('id', post.id);

          logger.info('[Scheduler] Auto-assigned slot', {
            postId: post.id,
            timezone,
            scheduled_at: scheduledAt
          });
        } catch (slotErr: any) {
          logger.warn('[Scheduler] Failed to assign slot', { postId: post.id, error: slotErr.message });
        }
      }
    }

    const { data: posts, error } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', nowIso);

    if (error) throw error;
    if (!posts || posts.length === 0) return;

    logger.info(`[Scheduler] Znaleziono ${posts.length} postów do opublikowania.`);

    for (const post of posts) {
      try {
        // Znajdź połączenie dla danej platformy
        const platform = (post.form_data?.platform || 'facebook').toLowerCase();
        const { data: connection } = await supabase
          .from('social_connections')
          .select('*')
          .eq('user_id', post.user_id)
          .eq('platform', platform)
          .eq('is_active', true)
          .single();

        if (!connection) {
          logger.warn(`[Scheduler] Brak połączenia dla postu ${post.id} (platforma: ${platform})`);
          await supabase.from('scheduled_posts').update({ status: 'failed' }).eq('id', post.id);
          continue;
        }

        // Symulujemy request do /publish (lub wywołujemy logikę bezpośrednio)
        // Tutaj wywołamy logikę bezpośrednio dla wydajności
        const postText = post.result?.postText || post.form_data?.topic || '';
        const imageUrl = post.result?.imageUrl;

        let publisher;
        let publishResult;

        if (platform === 'facebook') {
          publisher = new FacebookPublisher(connection.access_token);
          publishResult = await publisher.publishPost(connection.account_id, connection.access_token, postText, imageUrl);
        } else if (platform === 'instagram' && imageUrl) {
          publisher = new InstagramPublisher(connection.access_token);
          publishResult = await publisher.publishPost(connection.account_id, imageUrl, postText);
        } else if (platform === 'twitter') {
          publisher = new TwitterPublisher(process.env.TWITTER_APP_KEY || '', process.env.TWITTER_APP_SECRET || '', connection.access_token, connection.refresh_token || '');
          let mIds: string[] = [];
          if (imageUrl) mIds.push(await publisher.uploadMedia(imageUrl));
          publishResult = await publisher.publishTweet(postText, mIds);
        } else if (platform === 'linkedin') {
          publisher = new LinkedInPublisher({ clientId: process.env.LINKEDIN_CLIENT_ID || '', clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '', redirectUri: process.env.LINKEDIN_REDIRECT_URI || '' });
          publishResult = await publisher.publishPost(connection.access_token, connection.account_id, postText, imageUrl);
        }

        if (publishResult) {
          await supabase
            .from('scheduled_posts')
            .update({ status: 'published', published_url: publishResult.url })
            .eq('id', post.id);

          logger.info(`[Scheduler] Opublikowano post ${post.id} na ${platform}`);
        }
      } catch (e: any) {
        logger.error(`[Scheduler] Błąd publikacji postu ${post.id}:`, e);
        await supabase.from('scheduled_posts').update({ status: 'failed' }).eq('id', post.id);
      }
    }
  } catch (e: any) {
    const msg = e?.message || String(e);
    const isPermission = /permission denied/i.test(msg);

    if (isPermission) {
      schedulerBlockedUntil = Date.now() + 5 * 60 * 1000; // 5 minut backoff
      logger.error('[Scheduler] Błąd uprawnień do scheduled_posts – blokuję kolejne próby na 5 min', { message: msg });
    } else {
      logger.error('[Scheduler] Błąd krytyczny:', e);
    }
  }
}

// Uruchom scheduler co 60 sekund
setInterval(processScheduledPosts, 60000);
logger.info('🚀 Automat publikujący (Scheduler) został uruchomiony.');

// Analyze saved posts from DB
app.post('/api/social/analyze-saved', async (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  const { postIds } = req.body;

  if (!userId) return res.status(401).json({ error: 'User ID required' });
  if (!postIds || !Array.isArray(postIds)) return res.status(400).json({ error: 'Array of postIds required' });

  try {
    const { data: posts, error } = await supabase
      .from('social_posts')
      .select('*')
      .in('id', postIds)
      .eq('user_id', userId);

    if (error) throw error;
    if (!posts || posts.length === 0) return res.status(404).json({ error: 'No posts found to analyze' });

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const prompt = `Jesteś ekspertem social media. Przeanalizuj poniższe posty i przygotuj raport strategiczny:
    
    ${JSON.stringify(posts.map(p => ({
      platform: p.platform,
      content: p.content,
      metrics: p.metrics
    })), null, 2)}
    
    Zwróć odpowiedź w formacie JSON z polami:
    - sentiment (ogólny wydźwięk),
    - topPost (który post poradził sobie najlepiej i dlaczego),
    - improvementTips (lista 3 konkretnych porad na przyszłość),
    - contentPillars (3 główne filary tematyczne na podstawie tych postów).`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysis = JSON.parse(response.text().replace(/```json|```/g, ''));

    // Update posts with analysis result (optional metadata)
    await supabase.from('social_posts')
      .update({ ai_analysis: analysis })
      .in('id', postIds);

    res.json(analysis);
  } catch (error: any) {
    logger.error('Analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});


// Learn brand voice from history
app.post('/api/brand-voice/learn', async (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ error: 'User ID required' });

  try {
    logger.info(`[BrandVoice] Starting learn for user: ${userId}`);

    // 1. Sync social posts in background (best-effort)
    try {
      await syncUserSocialPosts(userId);
      logger.info(`[BrandVoice] Sync complete for user: ${userId}`);
    } catch (syncErr) {
      logger.warn('[BrandVoice] Sync failed, continuing with cached data:', syncErr);
    }

    // 2. Fetch app history (generated posts)
    const { data: historyItems } = await supabase
      .from('history')
      .select('content, metadata')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(15);

    // 3. Fetch synced social posts
    const { data: socialPosts } = await supabase
      .from('social_posts')
      .select('content, platform')
      .eq('user_id', userId)
      .order('published_at', { ascending: false })
      .limit(20);

    // 4. Fetch scheduled posts
    const { data: scheduledItems } = await supabase
      .from('scheduled_posts')
      .select('result')
      .eq('user_id', userId)
      .limit(10);

    logger.info(`[BrandVoice] Data found: history=${historyItems?.length || 0}, social_posts=${socialPosts?.length || 0}, scheduled=${scheduledItems?.length || 0}`);

    // 5. If social_posts is empty, try fetching directly from connected accounts
    let directSocialPosts: string[] = [];
    if (!socialPosts || socialPosts.length === 0) {
      const { data: connections } = await supabase
        .from('social_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      logger.info(`[BrandVoice] No synced posts. Found ${connections?.length || 0} active connections, trying direct fetch...`);

      if (connections && connections.length > 0) {
        for (const conn of connections) {
          try {
            if (conn.platform === 'facebook') {
              const fb = new FacebookPublisher(conn.access_token);
              const posts = await fb.getPosts(conn.account_id, conn.access_token);
              directSocialPosts.push(...posts.map((p: any) => p.content).filter(Boolean));
              logger.info(`[BrandVoice] Direct Facebook fetch: ${posts.length} posts from ${conn.account_id}`);
            } else if (conn.platform === 'instagram') {
              const ig = new InstagramPublisher(conn.access_token);
              const posts = await ig.getPosts(conn.account_id);
              directSocialPosts.push(...posts.map((p: any) => p.content || p.caption).filter(Boolean));
              logger.info(`[BrandVoice] Direct Instagram fetch: ${posts.length} posts`);
            }
          } catch (directErr: any) {
            logger.warn(`[BrandVoice] Direct fetch failed for ${conn.platform}:`, directErr.message);
          }
        }
      }
    }

    // 6. Compile all posts
    const allPosts = [
      ...(historyItems || []).map((h: any) => h.content || h.postText || h.metadata?.postText),
      ...(socialPosts || []).map((s: any) => s.content),
      ...directSocialPosts,
      ...(scheduledItems || []).map((s: any) => s.result?.postText || s.result?.content)
    ].filter((c): c is string => typeof c === 'string' && c.trim().length > 10);

    logger.info(`[BrandVoice] Total usable posts: ${allPosts.length}`);

    if (allPosts.length === 0) {
      return res.status(200).json({
        error: 'no_history_found',
        message: 'Nie znaleziono postów do analizy. Upewnij się, że: (1) Twoje konto Facebook jest połączone w zakładce "Social Media", (2) Twoja strona Facebook ma co najmniej 2-3 opublikowane posty z treścią tekstową, (3) token dostępu jest aktualny (spróbuj rozłączyć i połączyć konto ponownie).'
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-pro-latest' });
    const prompt = `Jesteś ekspertem ds. strategii marki. Przeanalizuj poniższe posty i przygotuj profil "Głosu Marki" (Brand Voice) oraz "Tożsamości Wizualnej" (Visual Style) dla tej firmy:
    
    POSTY (${allPosts.length} sztuk):
    ${allPosts.slice(0, 25).map((p, i) => `[${i + 1}] ${p}`).join('\n\n')}
    
    Zwróć odpowiedź w formacie JSON z następującymi polami:
    - brandName (nazwa firmy wywnioskowana z postów),
    - description (opis działalności i misji firmy - 2-3 zdania),
    - keywords (lista 10 słów kluczowych i tagów po przecinku),
    - tone (jeden z: Professional, Casual, Witty, Inspirational, Persuasive),
    - examplesToFollow (array z 3 najlepszymi fragmentami tekstów),
    - examplesToAvoid (array z 3 rzeczami, których ta marka powinna unikać),
    - avoid (lista słów/tematów do unikania po przecinku),
    - visualStyle (krótka instrukcja stylu wizualnego dla generatora obrazów AI, np. "jasne, minimalistyczne zdjęcia w stylu skandynawskim" lub "dynamiczne ujęcia, nasycone kolory, styl sportowy"),
    - profileName (proponowana nazwa profilu, np. "Profil Firmowy [Nazwa]")`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const profile = JSON.parse(response.text().replace(/```json|```/g, '').trim());

    logger.info(`[BrandVoice] Profile generated successfully for user: ${userId}`);
    res.json(profile);
  } catch (error: any) {
    logger.error('[BrandVoice] Error:', error);
    res.status(500).json({ error: error.message });
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

        const genModel = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
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
    await logCost(userId, 'batch_generation', successful.length * COST_ESTIMATES['gemini-text'], JSON.stringify({
      platforms: platforms.length,
      successful: successful.length
    }));

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
    const { model = 'gemini-flash-latest', contents, config } = req.body || {};
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
      responseMimeType: config?.responseMimeType,
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
        90000, // 90s timeout
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
app.post('/api/generate-content-stream', streamLimiter, validateRequest(textGenerationSchema), async (req, res) => {
  try {
    const { model = 'gemini-flash-latest', contents, config } = req.body || {};
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
          responseMimeType: config?.responseMimeType,
        }
      }),
      120000, // 120s timeout for streaming
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
    const { prompt, history, model = 'gemini-flash-latest' } = req.body;
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


// --- GENEROWANIE OBRAZÓW (Google Imagen 3) ---
app.post('/api/generate-images', expensiveLimiter, validateRequest(imageGenerationSchema), async (req, res) => {
  try {
    const { prompt, config } = req.body;
    const userId = req.header('x-user-id') || 'unknown';
    const apiKey = process.env.GOOGLE_API_KEY || process.env.VITE_API_KEY;

    if (!apiKey) {
      logger.error('[Imagen] API key not configured');
      return res.status(503).json({ message: 'Image generation unavailable - Google API key not configured' });
    }

    const startTime = Date.now();

    // Generate image via Google Imagen REST API
    const response = await retryWithBackoff(
      () => withTimeout(
        axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`,
          {
            instances: [{ prompt }],
            parameters: {
              sampleCount: config?.numberOfImages || 1,
              aspectRatio: config?.aspectRatio || '1:1',
              outputOptions: { mimeType: config?.outputMimeType || 'image/jpeg' }
            }
          },
          { headers: { 'Content-Type': 'application/json' } }
        ),
        120000,
        'Imagen generation timed out'
      ),
      { maxRetries: 2, baseDelay: 2000 }
    );

    const base64Image = response.data?.predictions?.[0]?.bytesBase64Encoded;
    if (!base64Image) {
      throw new Error('No image returned from Imagen');
    }

    const mimeType = response.data?.predictions?.[0]?.mimeType || 'image/jpeg';
    const finalImageUrl = `data:${mimeType};base64,${base64Image}`;

    const duration = Date.now() - startTime;
    const estimatedCost = COST_ESTIMATES['dalle-standard'] || 0.04; // Adjust cost tracking as needed for Imagen

    logAPICall('Imagen', 'generate-images', duration, true);
    logCost(userId, 'image-generation', estimatedCost, 'Imagen');

    // Track cost in database
    if (costTracker) {
      try {
        await costTracker.trackCost({
          userId,
          operation: 'image-generation',
          provider: 'Imagen',
          cost: estimatedCost,
          durationMs: duration,
          success: true,
          metadata: { size: config?.aspectRatio, quality: 'standard' }
        });
      } catch (e: any) {
        logger.warn('[CostTracker] Failed to track cost due to DB error', { error: e.message });
      }
    }

    // Return format expected by frontend
    res.json({
      generatedImages: [{ image: { mimeType, imageBytes: base64Image } }],
      publicUrls: [finalImageUrl],
      revisedPrompt: prompt
    });

  } catch (error: any) {
    logger.error('[Imagen] Generation failed', { error: error.message, userId: req.header('x-user-id') || 'unknown' });
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
      const genModel = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
      const promptResp = await retryWithBackoff(
        () => withTimeout(
          genModel.generateContent(`
            Create a visual prompt for Luma Dream Machine based on: "${postText}".
            Style: ${style || 'cinematic'}.
            Format: ${isVertical ? 'Vertical 9:16' : 'Cinematic 16:9'}.
            Output ONLY the prompt in English (max 40 words).
          `),
          60000,
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
            model: 'ray-2',
            prompt: visualPrompt,
            aspect_ratio: (isVertical ? '9:16' : '16:9') as any,
            loop: false,
          }),
          60000,
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
          () => luma.generations.get(generation.id as string),
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
              120000,
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
            thumbnail: (status.assets as any)?.image || '',
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
      const genModel = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
      const promptResp = await retryWithBackoff(
        () => withTimeout(
          genModel.generateContent(`
            Create a visual prompt for Zeroscope AI (background video) based on: "${postText}".
            Style: ${style || 'modern'}.
            Rules: NO TEXT, focused on scenery/background. English only.
            Output ONLY the prompt.
          `),
          60000,
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
          180000, // 180s timeout for Replicate
          'Replicate video generation timed out'
        ),
        { maxRetries: 2, baseDelay: 3000 }
      );

      const videoUrl = Array.isArray(output) ? output[0] : String(output);

      // Download with retry
      const vidRes = await retryWithBackoff(
        () => withTimeout(
          axios.get(videoUrl, { responseType: 'arraybuffer' }),
          120000,
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
        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
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

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
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
  logRequest(req, 200, 0);

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

    logCost(userId, 'content-scoring', 0.001, 'Internal'); // Minimalny koszt

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
  logRequest(req, 200, 0);

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

// 🎬 VIDEO GENERATION (Google Veo)
app.post('/api/generate-videos', expensiveLimiter, async (req, res) => {
  try {
    const { prompt, image, config } = req.body;
    const userId = req.header('x-user-id') || 'unknown';
    const currentApiKey = process.env.GOOGLE_API_KEY || process.env.VITE_API_KEY;

    if (!currentApiKey) {
      return res.status(503).json({ message: 'Google API key not configured' });
    }

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-fast-generate-preview:predict?key=${currentApiKey}`,
      {
        instances: [{ prompt, image }],
        parameters: config
      },
      { headers: { 'Content-Type': 'application/json' } }
    ).catch(e => {
      throw new Error(e.response?.data?.error?.message || e.message);
    });

    res.json(response.data);

  } catch (error: any) {
    logger.error('[Veo] Video generation failed:', { error: error.message });
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/get-videos-operation', async (req, res) => {
  try {
    const { operation } = req.body;
    const currentApiKey = process.env.GOOGLE_API_KEY || process.env.VITE_API_KEY;

    if (!currentApiKey) return res.status(503).json({ message: 'Google API key not configured' });

    const response = await axios.get(
      `https://generativelanguage.googleapis.com/v1beta/${operation.name}?key=${currentApiKey}`
    ).catch(e => {
      throw new Error(e.response?.data?.error?.message || e.message);
    });

    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

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
      'POST /api/social/post-mortem',
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
