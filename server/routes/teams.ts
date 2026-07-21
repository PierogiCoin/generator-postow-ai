/**
 * Teams API — create workspace, invite by email, accept invites.
 */

import express, { Response, NextFunction } from 'express';
import crypto from 'crypto';
import {
  requireSupabaseAuth,
  SupabaseAuthRequest,
  getAuthUserId,
} from '../middleware/supabaseAuth.js';
import { supabase } from '../supabase.js';
import { AppError } from '../middleware/errorHandler.js';
import logger from '../logger.js';

const router = express.Router();

type TeamRole = 'owner' | 'manager' | 'member';

async function getMembership(teamId: string, userId: string) {
  const { data, error } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new AppError(500, 'Nie udało się sprawdzić członkostwa');
  return data as { role: TeamRole } | null;
}

async function assertManager(teamId: string, userId: string) {
  const membership = await getMembership(teamId, userId);
  if (!membership || !['owner', 'manager'].includes(membership.role)) {
    throw new AppError(403, 'Brak uprawnień (wymagana rola manager/owner)');
  }
  return membership;
}

async function resolveUserIdByEmail(email: string): Promise<string | null> {
  try {
    const admin = supabase.auth.admin as {
      getUserByEmail?: (email: string) => Promise<{ data: { user: { id: string } | null }; error: unknown }>;
    };
    if (typeof admin.getUserByEmail === 'function') {
      const { data, error } = await admin.getUserByEmail(email);
      if (!error && data?.user?.id) return data.user.id;
    }
  } catch {
    // admin helper unavailable
  }
  return null;
}

async function loadTeamsForUser(userId: string) {
  const { data: memberships, error } = await supabase
    .from('team_members')
    .select('team_id, role, teams(id, name, owner_id)')
    .eq('user_id', userId);

  if (error) {
    logger.error('teams list error', error);
    throw new AppError(500, 'Nie udało się pobrać zespołów');
  }

  const teams = [];
  for (const row of memberships || []) {
    const teamRow = row.teams as unknown as { id: string; name: string; owner_id: string } | null;
    if (!teamRow) continue;

    const { data: members } = await supabase
      .from('team_members')
      .select('user_id, role')
      .eq('team_id', teamRow.id);

    const memberIds = (members || []).map((m) => m.user_id as string);
    const { data: profiles } = memberIds.length
      ? await supabase.from('profiles').select('id, name').in('id', memberIds)
      : { data: [] as { id: string; name: string | null }[] };

    const profileMap = new Map((profiles || []).map((p) => [p.id, p.name || 'Członek']));

    const memberList = (members || []).map((m) => ({
      id: m.user_id as string,
      name: profileMap.get(m.user_id as string) || 'Członek',
      email: '',
      role: (m.role === 'owner' ? 'manager' : m.role) as 'manager' | 'member',
    }));

    teams.push({
      id: teamRow.id,
      name: teamRow.name,
      members: memberList,
      myRole: row.role as TeamRole,
    });
  }

  return teams;
}

// GET /api/teams
router.get(
  '/',
  requireSupabaseAuth,
  async (req: SupabaseAuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = getAuthUserId(req);
      const teams = await loadTeamsForUser(userId);
      res.json({ teams });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/teams — create team
router.post(
  '/',
  requireSupabaseAuth,
  async (req: SupabaseAuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = getAuthUserId(req);
      const name = String(req.body?.name || '').trim();
      if (!name || name.length < 2) {
        throw new AppError(400, 'Podaj nazwę zespołu (min. 2 znaki)');
      }

      const { data: team, error } = await supabase
        .from('teams')
        .insert({ name, owner_id: userId })
        .select('id, name, owner_id')
        .single();

      if (error || !team) {
        logger.error('team create error', error);
        throw new AppError(500, 'Nie udało się utworzyć zespołu. Uruchom DATABASE_SCHEMA_TEAMS.sql.');
      }

      const { error: memberError } = await supabase.from('team_members').insert({
        team_id: team.id,
        user_id: userId,
        role: 'owner',
      });

      if (memberError) {
        logger.error('team owner membership error', memberError);
        await supabase.from('teams').delete().eq('id', team.id);
        throw new AppError(500, 'Nie udało się dodać właściciela do zespołu');
      }

      await supabase.from('profiles').update({ current_team_id: team.id }).eq('id', userId);

      res.status(201).json({
        team: {
          id: team.id,
          name: team.name,
          members: [
            {
              id: userId,
              name: req.user?.email?.split('@')[0] || 'Owner',
              email: req.user?.email || '',
              role: 'manager' as const,
            },
          ],
          myRole: 'owner' as const,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/teams/invites/accept — MUST be before /:teamId/invite
router.post(
  '/invites/accept',
  requireSupabaseAuth,
  async (req: SupabaseAuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = getAuthUserId(req);
      const email = (req.user?.email || '').toLowerCase();
      if (!email) throw new AppError(400, 'Brak e-maila na koncie');

      const token = req.body?.token ? String(req.body.token) : null;

      let query = supabase
        .from('team_invites')
        .select('id, team_id, role, token, status, expires_at')
        .eq('status', 'pending')
        .ilike('email', email);

      if (token) {
        query = query.eq('token', token);
      }

      const { data: invites, error } = await query;
      if (error) {
        logger.error('accept invites fetch error', error);
        throw new AppError(500, 'Nie udało się pobrać zaproszeń');
      }

      const accepted: string[] = [];
      for (const invite of invites || []) {
        if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
          await supabase
            .from('team_invites')
            .update({ status: 'expired' })
            .eq('id', invite.id);
          continue;
        }

        const { error: memberError } = await supabase.from('team_members').upsert(
          {
            team_id: invite.team_id,
            user_id: userId,
            role: invite.role,
          },
          { onConflict: 'team_id,user_id' }
        );

        if (memberError) {
          logger.error('accept invite membership error', memberError);
          continue;
        }

        await supabase
          .from('team_invites')
          .update({ status: 'accepted' })
          .eq('id', invite.id);

        accepted.push(invite.team_id);
      }

      const teams = await loadTeamsForUser(userId);
      res.json({ acceptedTeamIds: accepted, teams });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/teams/:teamId/invite
router.post(
  '/:teamId/invite',
  requireSupabaseAuth,
  async (req: SupabaseAuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = getAuthUserId(req);
      const teamId = req.params.teamId;
      const email = String(req.body?.email || '').trim().toLowerCase();
      const role = (req.body?.role === 'manager' ? 'manager' : 'member') as 'manager' | 'member';

      if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        throw new AppError(400, 'Podaj prawidłowy adres e-mail');
      }
      if (email === (req.user?.email || '').toLowerCase()) {
        throw new AppError(400, 'Nie możesz zaprosić samego siebie');
      }

      await assertManager(teamId, userId);

      const existingUserId = await resolveUserIdByEmail(email);
      if (existingUserId) {
        const { data: already } = await supabase
          .from('team_members')
          .select('id')
          .eq('team_id', teamId)
          .eq('user_id', existingUserId)
          .maybeSingle();

        if (already) {
          throw new AppError(409, 'Użytkownik jest już w zespole');
        }

        const { error: addError } = await supabase.from('team_members').insert({
          team_id: teamId,
          user_id: existingUserId,
          role,
        });
        if (addError) {
          logger.error('direct team add error', addError);
          throw new AppError(500, 'Nie udało się dodać członka');
        }

        return res.json({ status: 'added', email, role });
      }

      await supabase
        .from('team_invites')
        .update({ status: 'revoked' })
        .eq('team_id', teamId)
        .ilike('email', email)
        .eq('status', 'pending');

      const token = crypto.randomBytes(24).toString('hex');
      const { error: inviteError } = await supabase.from('team_invites').insert({
        team_id: teamId,
        email,
        role,
        invited_by: userId,
        token,
        status: 'pending',
      });

      if (inviteError) {
        logger.error('team invite error', inviteError);
        throw new AppError(500, 'Nie udało się utworzyć zaproszenia');
      }

      res.status(201).json({
        status: 'invited',
        email,
        role,
        message: 'Zaproszenie utworzone. Po rejestracji / zalogowaniu użytkownik zostanie dodany automatycznie.',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
