import { useCallback, useEffect, useRef, useState } from 'react';
import type { CanvasSnapshot } from './model';

interface UseCanvasHistoryParams {
  initialSnapshot: CanvasSnapshot;
  restoreSnapshot: (snapshot: CanvasSnapshot) => void;
}

export function useCanvasHistory({
  initialSnapshot,
  restoreSnapshot,
}: UseCanvasHistoryParams) {
  const [history, setHistory] = useState<CanvasSnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const historyReady = useRef(false);
  const historyIndexRef = useRef(-1);
  const historyRef = useRef<CanvasSnapshot[]>([]);

  const pushHistory = useCallback((next: CanvasSnapshot) => {
    const idx = historyIndexRef.current;
    const base = idx >= 0 ? historyRef.current.slice(0, idx + 1) : historyRef.current;
    const trimmed = [...base, next].slice(-30);
    historyRef.current = trimmed;
    historyIndexRef.current = trimmed.length - 1;
    setHistory(trimmed);
    setHistoryIndex(historyIndexRef.current);
  }, []);

  useEffect(() => {
    if (historyReady.current) return;
    historyReady.current = true;
    historyRef.current = [initialSnapshot];
    historyIndexRef.current = 0;
    setHistory([initialSnapshot]);
    setHistoryIndex(0);
  }, [initialSnapshot]);

  const undo = useCallback(() => {
    const idx = historyIndexRef.current;
    if (idx <= 0) return;
    const next = idx - 1;
    const snap = historyRef.current[next];
    if (!snap) return;
    historyIndexRef.current = next;
    setHistoryIndex(next);
    restoreSnapshot(snap);
  }, [restoreSnapshot]);

  const redo = useCallback(() => {
    const idx = historyIndexRef.current;
    if (idx >= historyRef.current.length - 1) return;
    const next = idx + 1;
    const snap = historyRef.current[next];
    if (!snap) return;
    historyIndexRef.current = next;
    setHistoryIndex(next);
    restoreSnapshot(snap);
  }, [restoreSnapshot]);

  return {
    history,
    historyIndex,
    pushHistory,
    undo,
    redo,
  };
}
