// supabaseClient.ts

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;
let supabasePromise: Promise<SupabaseClient> | null = null;

const looksLikeHtml = (v?: string) =>
  typeof v === 'string' && v.trim().length > 0 && (/^\s*</.test(v) || v.includes('<!DOCTYPE') || v.includes('<html'));

const resolveEnv = (): { url?: string; anonKey?: string } => {
  // Bezpieczny odczyt: preferuj process.env (Railway/devcontainer), fallback na import.meta.env jeśli dostępne.
  const nodeEnv: Record<string, any> = typeof process !== 'undefined' && process.env ? (process.env as any) : {};
  let metaEnv: Record<string, any> | undefined;
  
  // 🟢 POPRAWIONA LINIA: Usuwamy (import as any)
  try { metaEnv = import.meta.env; } catch { metaEnv = undefined; }

  const env: Record<string, any> = { ...nodeEnv, ...(metaEnv || {}) };

  // 🟢 Sugerowany priorytet dla środowiska VITE/Railway
  const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
      console.warn('Wykryto prawdopodobny klucz service_role. Nie wystawiaj go na froncie.');
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
    console.error('Inicjalizacja Supabase nie powiodła się:', err);
    throw err;
  }
};

export const initializeSupabase = (): Promise<SupabaseClient> => {
  if (supabaseInstance) return Promise.resolve(supabaseInstance);
  if (!supabasePromise) supabasePromise = _initializeSupabase();
  return supabasePromise;
};

export const getSupabase = (): SupabaseClient => {
  if (!supabaseInstance) {
    throw new Error('Supabase client nie został zainicjalizowany. Wywołaj initializeSupabase() przy starcie aplikacji.');
  }
  return supabaseInstance;
};