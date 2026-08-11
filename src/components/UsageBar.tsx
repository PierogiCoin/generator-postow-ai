import React from 'react';

interface UsageBarProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  limit: number;
}

export const UsageBar: React.FC<UsageBarProps> = ({ icon, label, value, limit }) => {
  const percentage = limit > 0 && limit !== Infinity ? Math.min((value / limit) * 100, 100) : 0;
  
  let barColor = 'bg-blue-500';
  if (percentage > 80) {
    barColor = 'bg-red-500';
  } else if (percentage > 50) {
    barColor = 'bg-yellow-500';
  }

  const limitDisplay = limit === Infinity ? '∞' : limit;

  return (
    <div>
      <div className="flex justify-between items-center mb-1 text-sm">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
        </div>
        <span className="font-semibold text-slate-900 dark:text-white">
          {value} / {limitDisplay}
        </span>
      </div>
      <div className="w-full bg-slate-200 dark:bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-label={`${label} usage`}
        ></div>
      </div>
    </div>
  );
};