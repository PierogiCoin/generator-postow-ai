import { randomUUID } from 'crypto';

export type VideoJobStage = 'queued' | 'prompt' | 'generating' | 'uploading' | 'done' | 'error';

export interface VideoJobResult {
  url: string;
  videoUrl: string;
  thumbnail: string;
  provider: string;
  cost_tier: string;
  duration: number;
  prompt: string;
}

export interface VideoJobStatus {
  jobId: string;
  stage: VideoJobStage;
  stageLabel: string;
  progress: number;
  activeProvider?: string;
  pollAttempt?: number;
  pollMax?: number;
  estimatedSeconds?: number;
  startedAt: number;
  updatedAt: number;
  result?: VideoJobResult;
  error?: string;
}

const STAGE_LABELS: Record<VideoJobStage, string> = {
  queued: 'Oczekiwanie w kolejce…',
  prompt: 'Przygotowanie promptu wideo…',
  generating: 'Generowanie wideo przez AI…',
  uploading: 'Zapisywanie wideo…',
  done: 'Gotowe!',
  error: 'Błąd generowania',
};

const PROVIDER_ETA: Record<string, number> = {
  veo: 90,
  luma: 120,
  replicate: 90,
  auto: 90,
};

const jobs = new Map<string, VideoJobStatus>();
const JOB_TTL_MS = 30 * 60 * 1000;

function pruneOldJobs() {
  const cutoff = Date.now() - JOB_TTL_MS;
  for (const [id, job] of jobs) {
    if (job.updatedAt < cutoff) jobs.delete(id);
  }
}

export function createVideoJob(userId: string, provider: string): string {
  pruneOldJobs();
  const jobId = randomUUID();
  const now = Date.now();
  jobs.set(jobId, {
    jobId,
    stage: 'queued',
    stageLabel: STAGE_LABELS.queued,
    progress: 2,
    activeProvider: provider,
    estimatedSeconds: PROVIDER_ETA[provider] ?? 90,
    startedAt: now,
    updatedAt: now,
  });
  return jobId;
}

export function updateVideoJob(
  jobId: string,
  update: Partial<
    Pick<
      VideoJobStatus,
      'stage' | 'stageLabel' | 'progress' | 'activeProvider' | 'pollAttempt' | 'pollMax' | 'estimatedSeconds'
    >
  >
): void {
  const job = jobs.get(jobId);
  if (!job || job.stage === 'done' || job.stage === 'error') return;

  if (update.stage) {
    job.stage = update.stage;
    job.stageLabel = update.stageLabel ?? STAGE_LABELS[update.stage];
  } else if (update.stageLabel) {
    job.stageLabel = update.stageLabel;
  }
  if (update.progress !== undefined) job.progress = Math.min(99, Math.max(job.progress, update.progress));
  if (update.activeProvider) job.activeProvider = update.activeProvider;
  if (update.pollAttempt !== undefined) job.pollAttempt = update.pollAttempt;
  if (update.pollMax !== undefined) job.pollMax = update.pollMax;
  if (update.estimatedSeconds !== undefined) job.estimatedSeconds = update.estimatedSeconds;
  job.updatedAt = Date.now();
}

export function completeVideoJob(jobId: string, result: VideoJobResult): void {
  const job = jobs.get(jobId);
  if (!job) return;
  job.stage = 'done';
  job.stageLabel = STAGE_LABELS.done;
  job.progress = 100;
  job.result = result;
  job.activeProvider = result.provider;
  job.updatedAt = Date.now();
}

export function failVideoJob(jobId: string, error: string): void {
  const job = jobs.get(jobId);
  if (!job) return;
  job.stage = 'error';
  job.stageLabel = STAGE_LABELS.error;
  job.error = error;
  job.updatedAt = Date.now();
}

export function getVideoJob(jobId: string): VideoJobStatus | null {
  return jobs.get(jobId) ?? null;
}

export type ProgressReporter = (update: Parameters<typeof updateVideoJob>[1]) => void;

export function jobReporter(jobId: string | null): ProgressReporter {
  if (!jobId) return () => {};
  return (update) => updateVideoJob(jobId, update);
}
