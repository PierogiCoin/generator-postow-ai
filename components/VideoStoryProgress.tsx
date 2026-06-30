import React from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import type { VideoStoryProgressStatus } from '../services/videoStoryService';

const STEPS: { id: VideoStoryProgressStatus['stage']; label: string }[] = [
  { id: 'prompt', label: 'Prompt' },
  { id: 'generating', label: 'Generowanie' },
  { id: 'uploading', label: 'Zapis' },
  { id: 'done', label: 'Gotowe' },
];

function stepIndex(stage: VideoStoryProgressStatus['stage']): number {
  if (stage === 'queued') return -1;
  if (stage === 'prompt') return 0;
  if (stage === 'generating') return 1;
  if (stage === 'uploading') return 2;
  if (stage === 'done') return 3;
  return -1;
}

interface VideoStoryProgressProps {
  status: VideoStoryProgressStatus;
}

export const VideoStoryProgress: React.FC<VideoStoryProgressProps> = ({ status }) => {
  const current = stepIndex(status.stage);
  const elapsedSec = Math.floor((Date.now() - status.startedAt) / 1000);
  const etaSec =
    status.progress > 5 && status.estimatedSeconds
      ? Math.max(0, status.estimatedSeconds - elapsedSec)
      : status.estimatedSeconds;

  return (
    <div className="w-full max-w-sm space-y-5">
      <div className="space-y-3">
        {STEPS.map((step, i) => {
          const done = current > i || status.stage === 'done';
          const active = current === i;
          return (
            <div key={step.id} className="flex items-center gap-3">
              {done ? (
                <CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0" />
              ) : active ? (
                <Loader2 className="w-5 h-5 text-purple-500 animate-spin shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600 shrink-0" />
              )}
              <span
                className={`text-sm ${
                  active || done
                    ? 'text-slate-900 dark:text-white font-medium'
                    : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      <div>
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-700 ease-out"
            style={{ width: `${status.progress}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 text-center mt-2">{status.progress}%</p>
      </div>

      <p className="text-sm text-slate-700 dark:text-slate-300 text-center font-medium">
        {status.stageLabel}
      </p>

      {status.activeProvider && (
        <p className="text-xs text-slate-500 text-center">Silnik: {status.activeProvider}</p>
      )}

      <p className="text-xs text-slate-400 text-center">
        {elapsedSec > 0 && <>Upłynęło: {elapsedSec}s</>}
        {etaSec != null && etaSec > 0 && <> · Szacowany czas: ~{etaSec}s</>}
        {status.pollAttempt != null && status.pollMax != null && (
          <> · Postęp AI: {status.pollAttempt}/{status.pollMax}</>
        )}
      </p>

      <p className="text-[11px] text-slate-400 text-center leading-relaxed">
        Generowanie wideo trwa zwykle 1–3 minuty. Możesz poczekać — okno możesz zamknąć dopiero po zakończeniu.
      </p>
    </div>
  );
};
