-- ============================================
-- TEAMS — multi-user workspaces + invites
-- Run in Supabase SQL Editor (after profiles exist)
-- ============================================

CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_owner ON public.teams(owner_id);

CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'manager', 'member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_user ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON public.team_members(team_id);

CREATE TABLE IF NOT EXISTS public.team_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'member'
    CHECK (role IN ('manager', 'member')),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '14 days')
);

CREATE INDEX IF NOT EXISTS idx_team_invites_email ON public.team_invites(lower(email));
CREATE INDEX IF NOT EXISTS idx_team_invites_team ON public.team_invites(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_token ON public.team_invites(token);

-- profiles.current_team_id → teams (soft FK; ignore if already set)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_current_team_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_current_team_id_fkey
      FOREIGN KEY (current_team_id) REFERENCES public.teams(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read their teams" ON public.teams;
CREATE POLICY "Members can read their teams" ON public.teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = teams.id AND tm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners can update teams" ON public.teams;
CREATE POLICY "Owners can update teams" ON public.teams
  FOR UPDATE USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated can create teams" ON public.teams;
CREATE POLICY "Authenticated can create teams" ON public.teams
  FOR INSERT WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can delete teams" ON public.teams;
CREATE POLICY "Owners can delete teams" ON public.teams
  FOR DELETE USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Members can read team_members" ON public.team_members;
CREATE POLICY "Members can read team_members" ON public.team_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Managers can insert team_members" ON public.team_members;
CREATE POLICY "Managers can insert team_members" ON public.team_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'manager')
    )
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Managers can update team_members" ON public.team_members;
CREATE POLICY "Managers can update team_members" ON public.team_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'manager')
    )
  );

DROP POLICY IF EXISTS "Managers can delete team_members" ON public.team_members;
CREATE POLICY "Managers can delete team_members" ON public.team_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'manager')
    )
  );

DROP POLICY IF EXISTS "Members can read team_invites" ON public.team_invites;
CREATE POLICY "Members can read team_invites" ON public.team_invites
  FOR SELECT USING (
    lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_invites.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'manager')
    )
  );

DROP POLICY IF EXISTS "Managers can insert team_invites" ON public.team_invites;
CREATE POLICY "Managers can insert team_invites" ON public.team_invites
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_invites.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'manager')
    )
  );

DROP POLICY IF EXISTS "Managers can update team_invites" ON public.team_invites;
CREATE POLICY "Managers can update team_invites" ON public.team_invites
  FOR UPDATE USING (
    lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_invites.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'manager')
    )
  );
