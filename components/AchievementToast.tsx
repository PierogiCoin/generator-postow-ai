import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Achievement } from '../types';
import type { Toast } from '../hooks/useNotifications';

interface AchievementToastProps {
  toast: Toast & { achievement: Achievement };
  onRemove: (id: string) => void;
}

const ConfettiPiece: React.FC<{ initialX: number; initialY: number; rotation: number; color: string }> = ({ initialX, initialY, rotation, color }) => (
  <div
    className="absolute w-2 h-4"
    style={{
      backgroundColor: color,
      left: `${initialX}%`,
      top: `${initialY}%`,
      transform: `rotate(${rotation}deg)`,
      animation: `fall 3s linear forwards`,
    }}
  />
);

export const AchievementToast: React.FC<AchievementToastProps> = ({ toast, onRemove }) => {
  const { t } = useTranslation();
  const Icon = toast.achievement.icon;

  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 7000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const confettiColors = ['#fde68a', '#818cf8', '#a78bfa', '#f472b6', '#60a5fa'];
  const confetti = Array.from({ length: 30 }).map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 80 - 100, // Start above the toast
    rotation: Math.random() * 360,
    color: confettiColors[i % confettiColors.length],
  }));

  return (
    <div className="relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-4 flex items-center gap-4 animate-fade-in-up w-full max-w-sm overflow-hidden">
      <style>{`
        @keyframes fall {
          to {
            transform: translateY(200px) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
      <div className="absolute inset-0 pointer-events-none">
        {confetti.map(c => (
          <ConfettiPiece key={c.id} initialX={c.x} initialY={c.y} rotation={c.rotation} color={c.color} />
        ))}
      </div>
      <div className="relative flex-shrink-0 w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/50 flex items-center justify-center">
        <Icon className="w-7 h-7 text-yellow-500" />
      </div>
      <div className="relative flex-grow">
        <p className="text-sm font-bold text-yellow-600 dark:text-yellow-400">{t('achievements.unlocked')}</p>
        <p className="text-base font-semibold text-slate-800 dark:text-white">{t(toast.achievement.name)}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{t(toast.achievement.description)}</p>
      </div>
    </div>
  );
};
