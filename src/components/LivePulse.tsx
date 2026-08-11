import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface PulseLog {
    id: string;
    msg: string;
    type: 'info' | 'success' | 'warning' | 'error';
    time: string;
}

export const LivePulse: React.FC = () => {
    const [secondsToNext, setSecondsToNext] = useState(60);
    const [logs, setLogs] = useState<PulseLog[]>([
        { id: '1', msg: 'System automatyzacji aktywny', type: 'success', time: new Date().toLocaleTimeString() },
        { id: '2', msg: 'Oczekiwanie na zaplanowane posty...', type: 'info', time: new Date().toLocaleTimeString() }
    ]);

    useEffect(() => {
        const interval = setInterval(() => {
            setSecondsToNext(sec => {
                if (sec <= 1) {
                    const newLog: PulseLog = {
                        id: Date.now().toString(),
                        msg: 'Sprawdzanie kolejki publikacji...',
                        type: 'info',
                        time: new Date().toLocaleTimeString()
                    };
                    setLogs(prev => [newLog, ...prev].slice(0, 5));
                    return 60;
                }
                return sec - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="p-6 border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#0a1220]/70">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <Activity className="w-5 h-5 text-emerald-500" />
                    <div>
                        <h3 className="font-display text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                            Status Automatyzacji
                        </h3>
                        <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.14em]">
                            Silnik pracuje
                        </p>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Następny skan</span>
                    <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--hero-accent)' }}>{secondsToNext}s</span>
                </div>
            </div>

            <div className="space-y-2 mt-4">
                {logs.map(log => (
                    <div key={log.id} className="flex items-start gap-2 text-[10px] animate-fade-in">
                        <span className="text-slate-400 font-medium tabular-nums shrink-0">{log.time}</span>
                        <div className="flex items-center gap-1.5 min-w-0">
                            {log.type === 'success' && <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />}
                            {log.type === 'info' && <Clock className="w-3 h-3 shrink-0" style={{ color: 'var(--hero-accent)' }} />}
                            {log.type === 'warning' && <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />}
                            <span className={`truncate leading-none ${log.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                {log.msg}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200/70 dark:border-white/10 flex justify-between items-center">
                <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700" />
                </div>
            </div>
        </div>
    );
};
