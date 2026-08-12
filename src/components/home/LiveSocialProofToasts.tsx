/**
 * Zachowane komponenty pomocnicze — bez fałszywych „live” toastów aktywności.
 * LiveSocialProofToasts usunięte z landingu (trust / AppSumo readiness).
 */

import React from 'react';

export const InlineProofToast: React.FC<{ text: string; className?: string }> = ({
  text,
  className = '',
}) => (
  <div
    className={`p-3 rounded-xl bg-black/40 backdrop-blur border border-white/10 text-white text-xs flex items-center gap-2 ${className}`}
  >
    <span className="text-emerald-400 text-sm">⚡</span>
    <span className="leading-snug">{text}</span>
  </div>
);

/** @deprecated Nie używać na landingu — wyglądało jak fake social proof */
export const LiveSocialProofToasts: React.FC = () => null;
