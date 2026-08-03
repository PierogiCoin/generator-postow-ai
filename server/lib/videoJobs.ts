import { randomUUID } from 'crypto';
import { supabase } from '../supabase.js';
import logger from '../logger.js';

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
  userId: string;
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

/** In-process cache (fast path); Supabase is source of truth across instances. */
const jobs = new Map<string, VideoJobStatus>();
const JOB_TTL_MS = 30 * 60 * 1000;
let persistAvailable: boolean | null = null;

function pruneOldJobs() {
  const cutoff = Date.now() - JOB_TTL_MS;
  for (const [id, job] of jobs) {
    if (job.updatedAt < cutoff) jobs.delete(id);
  }
}

function rowToStatus(row: Record<string, unknown>): VideoJobStatus {
  return {
    jobId: String(row.id),
    userId: String(row.user_id),
    stage: row.stage as VideoJobStage,
    stageLabel: String(row.stage_label || STAGE_LABELS[(row.stage as VideoJobStage) || 'queued']),
    progress: Number(row.progress ?? 0),
    activeProvider: (row.active_provider as string) || undefined,
    pollAttempt: row.poll_attempt != null ? Number(row.poll_attempt) : undefined,
    pollMax: row.poll_max != null ? Number(row.poll_max) : undefined,
    estimatedSeconds: row.estimated_seconds != null ? Number(row.estimated_seconds) : undefined,
    startedAt: new Date(String(row.started_at)).getTime(),
    updatedAt: new Date(String(row.updated_at)).getTime(),
    result: (row.result as VideoJobResult) || undefined,
    error: (row.error as string) || undefined,
  };
}

function statusToRow(job: VideoJobStatus) {
  return {
    id: job.jobId,
    user_id: job.userId,
    stage: job.stage,
    stage_label: job.stageLabel,
    progress: job.progress,
    active_provider: job.activeProvider ?? null,
    poll_attempt: job.pollAttempt ?? null,
    poll_max: job.pollMax ?? null,
    estimated_seconds: job.estimatedSeconds ?? null,
    result: job.result ?? null,
    error: job.error ?? null,
    started_at: new Date(job.startedAt).toISOString(),
    updated_at: new Date(job.updatedAt).toISOString(),
  };
}

async function persistJob(job: VideoJobStatus): Promise<void> {
  if (persistAvailable === false) return;
  try {
    const { error } = await supabase.from('video_jobs').upsert(statusToRow(job), {
      onConflict: 'id',
    });
    if (error) {
      if (persistAvailable === null) {
        logger.warn('[videoJobs] video_jobs table unavailable — using in-memory only', error.message);
        persistAvailable = false;
      }
      return;
    }
    persistAvailable = true;
  } catch (err) {
    if (persistAvailable === null) {
      logger.warn('[videoJobs] persist failed — using in-memory only', err);
      persistAvailable = false;
    }
  }
}

async function loadJobFromDb(jobId: string): Promise<VideoJobStatus | null> {
  if (persistAvailable === false) return null;
  try {
    const { data, error } = await supabase
      .from('video_jobs')
      .select('*')
      .eq('id', jobId)
      .maybeSingle();
    if (error) {
      if (persistAvailable === null) {
        logger.warn('[videoJobs] video_jobs table unavailable — using in-memory only', error.message);
        persistAvailable = false;
      }
      return null;
    }
    persistAvailable = true;
    if (!data) return null;
    const status = rowToStatus(data as Record<string, unknown>);
    jobs.set(jobId, status);
    return status;
  } catch {
    return null;
  }
}

export async function createVideoJob(userId: string, provider: string): Promise<string> {
  pruneOldJobs();
  const jobId = randomUUID();
  const now = Date.now();
  const job: VideoJobStatus = {
    jobId,
    userId,
    stage: 'queued',
    stageLabel: STAGE_LABELS.queued,
    progress: 2,
    activeProvider: provider,
    estimatedSeconds: PROVIDER_ETA[provider] ?? 90,
    startedAt: now,
    updatedAt: now,
  };
  jobs.set(jobId, job);
  await persistJob(job);
  return jobId;
}

export async function updateVideoJob(
  jobId: string,
  update: Partial<
    Pick<
      VideoJobStatus,
      'stage' | 'stageLabel' | 'progress' | 'activeProvider' | 'pollAttempt' | 'pollMax' | 'estimatedSeconds'
    >
  >
): Promise<void> {
  let job = jobs.get(jobId);
  if (!job) {
    job = (await loadJobFromDb(jobId)) ?? undefined;
  }
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
  jobs.set(jobId, job);
  await persistJob(job);
}

export async function completeVideoJob(jobId: string, result: VideoJobResult): Promise<void> {
  let job = jobs.get(jobId);
  if (!job) job = (await loadJobFromDb(jobId)) ?? undefined;
  if (!job) return;
  job.stage = 'done';
  job.stageLabel = STAGE_LABELS.done;
  job.progress = 100;
  job.result = result;
  job.activeProvider = result.provider;
  job.updatedAt = Date.now();
  jobs.set(jobId, job);
  await persistJob(job);
}

export async function failVideoJob(jobId: string, error: string): Promise<void> {
  let job = jobs.get(jobId);
  if (!job) job = (await loadJobFromDb(jobId)) ?? undefined;
  if (!job) return;
  job.stage = 'error';
  job.stageLabel = STAGE_LABELS.error;
  job.error = error;
  job.updatedAt = Date.now();
  jobs.set(jobId, job);
  await persistJob(job);
}

export async function getVideoJob(jobId: string): Promise<VideoJobStatus | null> {
  const cached = jobs.get(jobId);
  if (cached) return cached;
  return loadJobFromDb(jobId);
}

export type ProgressReporter = (update: Parameters<typeof updateVideoJob>[1]) => void;

export function jobReporter(jobId: string | null): ProgressReporter {
  if (!jobId) return () => {};
  return (update) => {
    void updateVideoJob(jobId, update);
  };
}
