/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_LONG_RUNNING_API_BASE_URL?: string;
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_APP_BUILD_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
