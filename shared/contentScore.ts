/** Shared content quality score shape (client API + server Gemini scoring). */

export interface ContentScore {
  overall: number; // 0-100
  engagement: {
    score: number;
    level: 'low' | 'medium' | 'high';
    feedback: string[];
  };
  seo: {
    score: number;
    level: 'low' | 'medium' | 'high';
    feedback: string[];
  };
  platformFit: {
    score: number;
    level: 'poor' | 'good' | 'excellent';
    feedback: string[];
  };
  suggestions: string[];
  badge: 'red' | 'yellow' | 'green';
  /** Calibrated auto-publish threshold (may differ from default 70). */
  calibratedMinScore?: number;
  calibrationSampleSize?: number;
}
