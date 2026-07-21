-- ============================================
-- BRAND MEMORY — documents for lightweight RAG
-- Run in Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS public.brand_memory_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID,
  source_type TEXT NOT NULL CHECK (source_type IN ('url', 'pdf', 'manual', 'top_post')),
  source_url TEXT,
  title TEXT,
  excerpt TEXT NOT NULL,
  platform TEXT,
  engagement_score DOUBLE PRECISION DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brand_memory_user ON public.brand_memory_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_memory_engagement ON public.brand_memory_documents(user_id, engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_brand_memory_created ON public.brand_memory_documents(user_id, created_at DESC);

ALTER TABLE public.brand_memory_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own brand memory" ON public.brand_memory_documents;
CREATE POLICY "Users can view own brand memory" ON public.brand_memory_documents
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own brand memory" ON public.brand_memory_documents;
CREATE POLICY "Users can insert own brand memory" ON public.brand_memory_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own brand memory" ON public.brand_memory_documents;
CREATE POLICY "Users can update own brand memory" ON public.brand_memory_documents
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own brand memory" ON public.brand_memory_documents;
CREATE POLICY "Users can delete own brand memory" ON public.brand_memory_documents
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role all brand memory" ON public.brand_memory_documents;
CREATE POLICY "Service role all brand memory" ON public.brand_memory_documents
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE public.brand_memory_documents IS 'User brand memory chunks (URL/PDF/manual) for RAG-style generation context.';
