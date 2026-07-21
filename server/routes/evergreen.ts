/**
 * Evergreen queue — republish / recycle content after N days.
 */

import express, { Response, NextFunction } from 'express';
import {
  requireSupabaseAuth,
  SupabaseAuthRequest,
  getAuthUserId,
} from '../middleware/supabaseAuth.js';
import { supabase } from '../supabase.js';
import { AppError } from '../middleware/errorHandler.js';
import logger from '../logger.js';

const router = express.Router();

function mapItem(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    platform: row.platform as string,
    sourceContent: row.source_content as string,
    recycleAfterDays: row.recycle_after_days as number,
    nextRunAt: row.next_run_at as string,
    timesRecycled: row.times_recycled as number,
    status: row.status as string,
  };
}

router.get(
  '/',
  requireSupabaseAuth,
  async (req: SupabaseAuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = getAuthUserId(req);
      const { data, error } = await supabase
        .from('evergreen_queue')
        .select('*')
        .eq('user_id', userId)
        .neq('status', 'archived')
        .order('next_run_at', { ascending: true });

      if (error) {
        logger.error('evergreen list', error);
        throw new AppError(500, 'Nie udało się pobrać kolejki evergreen. Uruchom DATABASE_SCHEMA_EVERGREEN.sql.');
      }

      res.json({ items: (data || []).map((r) => mapItem(r as Record<string, unknown>)) });
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  '/',
  requireSupabaseAuth,
  async (req: SupabaseAuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = getAuthUserId(req);
      const content = String(req.body?.content || '').trim();
      const platform = String(req.body?.platform || 'facebook').toLowerCase();
      const days = Math.min(365, Math.max(7, Number(req.body?.recycleAfterDays) || 30));

      if (content.length < 20) {
        throw new AppError(400, 'Treść do recyklingu jest zbyt krótka');
      }

      const nextRun = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('evergreen_queue')
        .insert({
          user_id: userId,
          source_content: content.slice(0, 8000),
          platform,
          recycle_after_days: days,
          next_run_at: nextRun,
          source_history_id: req.body?.sourceHistoryId || null,
          connection_id: req.body?.connectionId || null,
          status: 'active',
        })
        .select('*')
        .single();

      if (error || !data) {
        logger.error('evergreen enqueue', error);
        throw new AppError(500, 'Nie udało się dodać do kolejki evergreen');
      }

      res.status(201).json({ item: mapItem(data as Record<string, unknown>) });
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  '/:id/pause',
  requireSupabaseAuth,
  async (req: SupabaseAuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = getAuthUserId(req);
      const { error } = await supabase
        .from('evergreen_queue')
        .update({ status: 'paused', updated_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .eq('user_id', userId);
      if (error) throw new AppError(500, 'Nie udało się wstrzymać');
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  '/:id/resume',
  requireSupabaseAuth,
  async (req: SupabaseAuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = getAuthUserId(req);
      const { error } = await supabase
        .from('evergreen_queue')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .eq('user_id', userId);
      if (error) throw new AppError(500, 'Nie udało się wznowić');
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
