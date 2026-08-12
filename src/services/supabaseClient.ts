// supabaseClient.ts

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;
let supabasePromise: Promise<SupabaseClient> | null = null;

const looksLikeHtml = (v?: string) =>
  typeof v === 'string' && v.trim().length > 0 && (/^\s*</.test(v) || v.includes('<!DOCTYPE') || v.includes('<html'));

const resolveEnv = (): { url?: string; anonKey?: string } => {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (looksLikeHtml(url) || looksLikeHtml(anonKey)) {
    throw new Error('Jedna ze zmiennych środowiskowych wygląda jak HTML (np. strona błędu). Sprawdź SUPABASE_URL i SUPABASE_ANON_KEY.');
  }

  return { url, anonKey };
};

const validateUrl = (u?: string): boolean => {
  if (!u) return false;
  try { new URL(u); return true; } catch { return false; }
};

const _initializeSupabase = async (): Promise<SupabaseClient> => {
  try {
    const { url: supabaseUrl, anonKey: supabaseAnonKey } = resolveEnv();

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('SUPABASE_URL i/lub SUPABASE_ANON_KEY nie są ustawione.');
    }
    if (!validateUrl(supabaseUrl)) {
      throw new Error('SUPABASE_URL nie jest prawidłowym URL.');
    }
    if (typeof supabaseAnonKey === 'string' && supabaseAnonKey.toLowerCase().includes('service_role')) {
      // Security warning: service_role key detected
    }

    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, { 
      auth: { 
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      } 
    });
    return supabaseInstance;
  } catch (err) {
    supabasePromise = null;
    throw err;
  }
};

const MOCK_URL = 'https://placeholder.supabase.co';
const MOCK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.placeholder';

export const isSupabaseConfigured = (): boolean => {
  try {
    const { url, anonKey } = resolveEnv();
    return Boolean(url && anonKey && validateUrl(url) && url !== MOCK_URL);
  } catch {
    return false;
  }
};

export const initializeSupabase = (): Promise<SupabaseClient> => {
  const client = getSupabase();
  return Promise.resolve(client);
};

export const getSupabase = (): SupabaseClient => {
  if (supabaseInstance) return supabaseInstance;

  try {
    const { url: supabaseUrl, anonKey: supabaseAnonKey } = resolveEnv();
    const validUrl = supabaseUrl && validateUrl(supabaseUrl) ? supabaseUrl : MOCK_URL;
    const validKey = supabaseAnonKey || MOCK_KEY;

    supabaseInstance = createClient(validUrl, validKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return supabaseInstance;
  } catch {
    return createClient(MOCK_URL, MOCK_KEY);
  }
};