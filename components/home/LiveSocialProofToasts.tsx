import React, { useState, useEffect } from 'react';

const TOASTS = [
  { id: 1, text: 'Ania z Warszawy wygenerowała 5 wpisów dla kawiarni' },
  { id: 2, text: 'Kuba z Wrocławia stworzył 30 postów dla firmy budowlanej' },
  { id: 3, text: 'Marta z Gdańska zaplanowała content na miesiąc w 15 minut' },
  { id: 4, text: 'Tomek z Krakowa zwiększył zasięgi o 340%' },
  { id: 5, text: 'Zosia z Poznania założyła konto i wygenerowała pierwszy post w 45 sekund' },
];

export const LiveSocialProofToasts: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed bottom-5 left-5 z-40 flex flex-col gap-2 max-w-xs sm:max-w-sm pointer-events-none">
      {TOASTS.map((toast, i) => (
        <div
          key={toast.id}
          className={`p-3 rounded-xl bg-black/40 backdrop-blur border border-white/10 text-white text-xs transition-all duration-700 ease-out transform ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: `${i * 180}ms` }}
        >
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 text-sm">⚡</span>
            <span className="leading-snug">{toast.text}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
