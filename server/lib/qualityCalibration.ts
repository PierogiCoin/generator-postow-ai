/**
 * Quality gate calibration from real social_posts.metrics.
 */

import { supabase } from './clients.js';
import logger from '../logger.js';
import {
  DEFAULT_AUTO_PUBLISH_MIN,
  applyCalibrationToScore,
  type CalibrationResult,
} from './qualityCalibrationCore.js';

export {
  DEFAULT_AUTO_PUBLISH_MIN,
  applyCalibrationToScore,
  type CalibrationResult,
} from './qualityCalibrationCore.js';

function engagementProxy(metrics: Record<string, unknown> | null | undefined): number {
  if (!metrics) return 0;
  return (
    (Number(metrics.likes) || 0) +
    (Number(metrics.comments) || 0) * 3 +
    (Number(metrics.shares) || 0) * 4 +
    (Number(metrics.views) || 0) * 0.01
  );
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * (sorted.length - 1))));
  return sorted[idx];
}

export async function getQualityCalibration(
  userId: string,
  platform?: string
): Promise<CalibrationResult> {
  const fallback: CalibrationResult = {
    minScore: DEFAULT_AUTO_PUBLISH_MIN,
    sampleSize: 0,
    topQuartileEngagement: 0,
    engagementPriorBoost: 0,
    calibrated: false,
  };

  try {
    let q = supabase
      .from('social_posts')
      .select('metrics, platform, content')
      .eq('user_id', userId)
      .not('content', 'is', null)
      .limit(120);

    if (platform) {
      q = q.ilike('platform', platform);
    }

    const { data, error } = await q;
    if (error || !data?.length) {
      if (error) logger.warn('[QualityCalibration]', error.message);
      return fallback;
    }

    const eng = data
      .map((row) => engagementProxy(row.metrics as Record<string, unknown>))
      .filter((n) => n > 0)
      .sort((a, b) => a - b);

    if (eng.length < 5) return fallback;

    const p25 = percentile(eng, 25);
    const p50 = percentile(eng, 50);
    const p75 = percentile(eng, 75);

    let minScore = DEFAULT_AUTO_PUBLISH_MIN;
    if (p75 > p50 * 1.5 && p50 > 10) {
      minScore = 65;
    } else if (p50 < 5 && eng.length >= 10) {
      minScore = 75;
    }

    const spread = p75 - p25 || 1;
    const engagementPriorBoost = Math.max(
      -5,
      Math.min(8, Math.round(((p75 - p50) / spread) * 5))
    );

    return {
      minScore: Math.max(60, Math.min(80, minScore)),
      sampleSize: eng.length,
      topQuartileEngagement: p75,
      engagementPriorBoost,
      calibrated: true,
    };
  } catch (e) {
    logger.warn('[QualityCalibration] exception', e);
    return fallback;
  }
}
