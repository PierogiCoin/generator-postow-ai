import React, { useMemo } from 'react';

export type HeatmapCell = {
  weekday: number;
  hour: number;
  samples: number;
  avgScore: number;
};

const WEEKDAY_LABELS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function scoreToColor(score: number, maxScore: number): string {
  if (maxScore <= 0 || score <= 0) return 'bg-slate-100 dark:bg-slate-800/80';
  const ratio = score / maxScore;
  if (ratio >= 0.75) return 'bg-emerald-500/90';
  if (ratio >= 0.5) return 'bg-cyan-500/70';
  if (ratio >= 0.25) return 'bg-amber-400/60';
  return 'bg-slate-200 dark:bg-slate-700/60';
}

interface PostingHeatmapProps {
  cells: HeatmapCell[];
  samples?: number;
  timezone?: string;
  emptyMessage?: string;
  compact?: boolean;
}

export const PostingHeatmap: React.FC<PostingHeatmapProps> = ({
  cells,
  samples = 0,
  timezone,
  emptyMessage = 'Brak danych — opublikuj posty lub połącz konta social, aby zobaczyć heatmapę.',
  compact = false,
}) => {
  const { grid, maxScore } = useMemo(() => {
    const map = new Map<string, HeatmapCell>();
    let max = 0;
    for (const c of cells) {
      map.set(`${c.weekday}-${c.hour}`, c);
      if (c.avgScore > max) max = c.avgScore;
    }
    return { grid: map, maxScore: max };
  }, [cells]);

  if (cells.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400 italic text-center py-6 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
        {emptyMessage}
      </p>
    );
  }

  const cellSize = compact ? 'w-5 h-5' : 'w-7 h-7';
  const labelSize = compact ? 'text-[9px]' : 'text-[10px]';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className={`${labelSize} font-bold uppercase tracking-widest text-slate-500`}>
          Twoje najlepsze godziny {timezone ? `(${timezone})` : ''}
        </p>
        <p className={`${labelSize} text-slate-400`}>{samples} postów w analizie</p>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="flex gap-0.5 mb-1 pl-8">
            {HOURS.filter((h) => h % (compact ? 4 : 3) === 0).map((h) => (
              <span
                key={h}
                className={`${labelSize} text-slate-400 text-center`}
                style={{ width: compact ? 20 : 28, marginLeft: h === 0 ? 0 : (compact ? 60 : 56) }}
              >
                {String(h).padStart(2, '0')}
              </span>
            ))}
          </div>
          {WEEKDAY_LABELS.map((dayLabel, weekday) => (
            <div key={dayLabel} className="flex items-center gap-1 mb-0.5">
              <span className={`w-7 shrink-0 ${labelSize} font-bold text-slate-500 text-right pr-1`}>
                {dayLabel}
              </span>
              <div className="flex gap-0.5">
                {HOURS.map((hour) => {
                  const cell = grid.get(`${weekday}-${hour}`);
                  const title = cell
                    ? `${dayLabel} ${String(hour).padStart(2, '0')}:00 — ${cell.samples} post(ów), score ${cell.avgScore.toFixed(2)}`
                    : `${dayLabel} ${String(hour).padStart(2, '0')}:00 — brak danych`;
                  return (
                    <div
                      key={hour}
                      title={title}
                      className={`${cellSize} rounded-sm ${scoreToColor(cell?.avgScore ?? 0, maxScore)} border border-white/10 dark:border-slate-900/30 transition-transform hover:scale-110`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <span className={`${labelSize} text-slate-400`}>Słabo</span>
        <div className="flex gap-0.5">
          <div className="w-4 h-3 rounded-sm bg-slate-200 dark:bg-slate-700" />
          <div className="w-4 h-3 rounded-sm bg-amber-400/60" />
          <div className="w-4 h-3 rounded-sm bg-cyan-500/70" />
          <div className="w-4 h-3 rounded-sm bg-emerald-500/90" />
        </div>
        <span className={`${labelSize} text-slate-400`}>Najlepiej</span>
      </div>
    </div>
  );
};
