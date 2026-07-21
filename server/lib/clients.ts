import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import LumaAI from 'lumaai';
import Replicate from 'replicate';
import { initCostTracker, costTracker } from '../costTracking.js';
import { loadEnv } from '../config/env.js';

const env = loadEnv();

export const apiKey = env.GOOGLE_API_KEY;
export const genAI = new GoogleGenerativeAI(env.GOOGLE_API_KEY);

export const luma = env.LUMA_API_KEY ? new LumaAI({ authToken: env.LUMA_API_KEY }) : null;
export const replicate = env.REPLICATE_API_TOKEN
  ? new Replicate({ auth: env.REPLICATE_API_TOKEN })
  : null;

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

initCostTracker(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

export { costTracker };
