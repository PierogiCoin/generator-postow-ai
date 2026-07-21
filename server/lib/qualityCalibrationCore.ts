/**
 * Pure quality-gate calibration helpers (no DB / env).
 */

export const DEFAULT_AUTO_PUBLISH_MIN = 70;

export interface CalibrationResult {
  minScore: number;
  sampleSize: number;
  topQuartileEngagement: number;
  engagementPriorBoost: number;
  calibrated: boolean;
}

export function applyCalibrationToScore(
  overall: number,
  engagementScore: number,
  calibration: CalibrationResult
): { overall: number; engagementScore: number; minScore: number } {
  if (!calibration.calibrated) {
    return { overall, engagementScore, minScore: DEFAULT_AUTO_PUBLISH_MIN };
  }

  const boostedEng = Math.max(
    0,
    Math.min(100, engagementScore + calibration.engagementPriorBoost)
  );
  const delta = boostedEng - engagementScore;
  const newOverall = Math.max(0, Math.min(100, Math.round(overall + delta * 0.4)));

  return {
    overall: newOverall,
    engagementScore: boostedEng,
    minScore: calibration.minScore,
  };
}
