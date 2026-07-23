import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { toPng } from 'html-to-image';
import { ModernButton } from './ModernButton';
import { BrandMarkIcon } from '../icons/BrandMarkIcon';
import { XMarkIcon } from '../icons/XMarkIcon';
import {
  type TextLayer,
  type CanvasSnapshot,
  type DragType,
  FONT_STACK,
  POSITION_PRESETS,
  clamp,
  applySnap,
  buildDefaultTextLayer,
} from './creativeCanvas/model';
import { useCanvasHistory } from './creativeCanvas/useCanvasHistory';

interface CreativeCanvasProps {
  imageUrl: string;
  initialText?: string;
  logoUrl?: string;
  mascotUrl?: string;
  /** When set, enables „Wykryj tekst z grafiki” (Gemini OCR → editable layer). */
  userId?: string;
  onExport?: (dataUrl: string) => void;
  onClose: () => void;
}

export const CreativeCanvas: React.FC<CreativeCanvasProps> = ({
  imageUrl,
  initialText = 'Twój Tekst',
  logoUrl,
  mascotUrl,
  userId,
  onExport,
  onClose,
}) => {
  const [backgroundUrl, setBackgroundUrl] = useState(imageUrl);
  const [layers, setLayers] = useState<TextLayer[]>([buildDefaultTextLayer(initialText)]);

  const [brandAssets, setBrandAssets] = useState({
    logo: { visible: !!logoUrl, x: 10, y: 10, scale: 1 },
    mascot: { visible: !!mascotUrl, x: 90, y: 90, scale: 1 },
  });

  const [activeLayerId, setActiveLayerId] = useState<string | null>('1');
  const [draggingType, setDraggingType] = useState<DragType | null>(null);
  const [guides, setGuides] = useState({ v: false, h: false });
  const [isExporting, setIsExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchStatus, setSearchStatus] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const restoreSnapshot = useCallback((snap: CanvasSnapshot) => {
    setLayers(snap.layers);
    setBackgroundUrl(snap.backgroundUrl);
    setActiveLayerId(snap.activeLayerId);
  }, []);

  const initialSnapshot = useMemo<CanvasSnapshot>(
    () => ({
      layers: [buildDefaultTextLayer(initialText)],
      backgroundUrl: imageUrl,
      activeLayerId: '1',
    }),
    [imageUrl, initialText]
  );

  const { history, historyIndex, pushHistory, undo, redo } = useCanvasHistory({
    initialSnapshot,
    restoreSnapshot,
  });

  const commitState = (partial: {
    layers?: TextLayer[];
    backgroundUrl?: string;
    activeLayerId?: string | null;
  }) => {
    const snap: CanvasSnapshot = {
      layers: partial.layers ?? layers,
      backgroundUrl: partial.backgroundUrl ?? backgroundUrl,
      activeLayerId:
        partial.activeLayerId !== undefined ? partial.activeLayerId : activeLayerId,
    };
    if (partial.layers) setLayers(partial.layers);
    if (partial.backgroundUrl !== undefined) setBackgroundUrl(partial.backgroundUrl);
    if (partial.activeLayerId !== undefined) setActiveLayerId(partial.activeLayerId);
    pushHistory(snap);
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const dragTypeRef = useRef<DragType | null>(null);
  const activeLayerIdRef = useRef(activeLayerId);
  const layersRef = useRef(layers);
  const backgroundUrlRef = useRef(backgroundUrl);

  useEffect(() => {
    activeLayerIdRef.current = activeLayerId;
  }, [activeLayerId]);
  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);
  useEffect(() => {
    backgroundUrlRef.current = backgroundUrl;
  }, [backgroundUrl]);

  const updatePosition = useCallback((type: DragType, xRaw: number, yRaw: number) => {
    const sx = applySnap(xRaw);
    const sy = applySnap(yRaw);
    setGuides({ v: sx.snapped, h: sy.snapped });

    if (type === 'text' && activeLayerIdRef.current) {
      const id = activeLayerIdRef.current;
      setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, x: sx.value, y: sy.value } : l)));
    } else if (type === 'logo') {
      setBrandAssets((prev) => ({
        ...prev,
        logo: { ...prev.logo, x: sx.value, y: sy.value },
      }));
    } else if (type === 'mascot') {
      setBrandAssets((prev) => ({
        ...prev,
        mascot: { ...prev.mascot, x: sx.value, y: sy.value },
      }));
    }
  }, []);

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const type = dragTypeRef.current;
      if (!type || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left - dragOffsetRef.current.x) / rect.width) * 100;
      const y = ((e.clientY - rect.top - dragOffsetRef.current.y) / rect.height) * 100;
      updatePosition(type, x, y);
    },
    [updatePosition]
  );

  const onPointerUp = useCallback(() => {
    const wasDragging = dragTypeRef.current;
    dragTypeRef.current = null;
    setDraggingType(null);
    setGuides({ v: false, h: false });
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    if (wasDragging === 'text') {
      pushHistory({
        layers: layersRef.current,
        backgroundUrl: backgroundUrlRef.current,
        activeLayerId: activeLayerIdRef.current,
      });
    }
  }, [onPointerMove, pushHistory]);

  const handlePointerDown = (
    e: React.PointerEvent,
    type: DragType,
    id?: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (id) setActiveLayerId(id);
    setDraggingType(type);
    dragTypeRef.current = type;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragOffsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  const nudgeCommitTimer = useRef<number | null>(null);

  const nudgeActive = useCallback(
    (dx: number, dy: number) => {
      if (!activeLayerId) return;
      setLayers((prev) => {
        const next = prev.map((l) => {
          if (l.id !== activeLayerId) return l;
          const sx = applySnap(l.x + dx);
          const sy = applySnap(l.y + dy);
          setGuides({ v: sx.snapped, h: sy.snapped });
          return { ...l, x: sx.value, y: sy.value };
        });
        layersRef.current = next;
        return next;
      });
      window.setTimeout(() => setGuides({ v: false, h: false }), 400);
      if (nudgeCommitTimer.current) window.clearTimeout(nudgeCommitTimer.current);
      nudgeCommitTimer.current = window.setTimeout(() => {
        pushHistory({
          layers: layersRef.current,
          backgroundUrl: backgroundUrlRef.current,
          activeLayerId: activeLayerIdRef.current,
        });
      }, 350);
    },
    [activeLayerId, pushHistory]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      e.preventDefault();
      const step = e.shiftKey ? 8 : 1;
      if (e.key === 'ArrowUp') nudgeActive(0, -step);
      if (e.key === 'ArrowDown') nudgeActive(0, step);
      if (e.key === 'ArrowLeft') nudgeActive(-step, 0);
      if (e.key === 'ArrowRight') nudgeActive(step, 0);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nudgeActive, undo, redo]);

  const applyPreset = (x: number, y: number) => {
    if (!activeLayerId) return;
    const nextLayers = layers.map((l) => (l.id === activeLayerId ? { ...l, x, y } : l));
    commitState({ layers: nextLayers });
    setGuides({ v: x === 50, h: y === 50 });
    window.setTimeout(() => setGuides({ v: false, h: false }), 500);
    setSearchStatus(`Przeniesiono na ${x}% × ${y}%`);
  };

  const updateActiveLayer = (updates: Partial<TextLayer>, commit = false) => {
    if (!activeLayerId) return;
    const nextLayers = layers.map((l) =>
      l.id === activeLayerId ? { ...l, ...updates } : l
    );
    setLayers(nextLayers);
    if (commit) {
      pushHistory({
        layers: nextLayers,
        backgroundUrl,
        activeLayerId,
      });
    }
  };

  const findOrCreateLayer = () => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchStatus('Wpisz fragment napisu do znalezienia.');
      return;
    }
    const lower = q.toLowerCase();
    const match = layers.find((l) => l.text.toLowerCase().includes(lower));
    if (match) {
      setActiveLayerId(match.id);
      setSearchStatus(
        `Znaleziono: „${match.text.slice(0, 48)}${match.text.length > 48 ? '…' : ''}” — ustaw pozycję poniżej.`
      );
      return;
    }
    const id = `layer-${Date.now()}`;
    const layer: TextLayer = {
      id,
      text: q,
      x: 50,
      y: 72,
      fontSize: 36,
      color: '#ffffff',
      fontWeight: '800',
      fontFamily: FONT_STACK,
      shadow: true,
      maxWidthPercent: 80,
      textAlign: 'center',
    };
    commitState({ layers: [...layers, layer], activeLayerId: id });
    setSearchStatus('Nie było takiej warstwy — dodano nową. Ustaw pozycję poniżej.');
  };

  const detectTextFromImage = async () => {
    if (!userId || isDetecting) return;
    setIsDetecting(true);
    setSearchStatus(null);
    try {
      const { analyzeImage } = await import('../../services/mediaService');
      const { coverTextRegionOnImage } = await import('../../utils/coverImageText');

      let base64 = '';
      let mimeType = 'image/jpeg';
      const src = backgroundUrl;
      if (src.startsWith('data:')) {
        const m = src.match(/^data:([^;]+);base64,(.+)$/);
        if (m) {
          mimeType = m[1];
          base64 = m[2];
        }
      } else {
        const res = await fetch(src);
        const blob = await res.blob();
        mimeType = blob.type || 'image/jpeg';
        const buf = await blob.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
        base64 = btoa(binary);
      }
      if (!base64) throw new Error('Nie udało się wczytać grafiki');

      const raw = await analyzeImage(
        base64,
        mimeType,
        `Find the main readable text / headline baked into this social media image.
Return ONLY JSON (no markdown):
{"text":"exact text or empty","x":0-100,"y":0-100,"width":0-100,"height":0-100}
x/y = center of the text bbox as % of image.
width/height = bbox size as % of image (include padding around letters).
If no text: text="" , x=50, y=50, width=20, height=8.`,
        userId
      );
      const jsonText = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(jsonText) as {
        text?: string;
        x?: number;
        y?: number;
        width?: number;
        height?: number;
      };
      const detected = (parsed.text || '').trim();
      if (!detected) {
        setSearchStatus('Nie wykryto napisu na grafice. Wpisz tekst ręcznie w „Znajdź napis”.');
        return;
      }

      const cx = clamp(Number(parsed.x) || 50);
      const cy = clamp(Number(parsed.y) || 50);
      const bw = clamp(Number(parsed.width) || Math.min(70, detected.length * 3), 8, 95);
      const bh = clamp(Number(parsed.height) || 12, 4, 40);

      setSearchStatus('Zakrywam stary napis na grafice…');
      const cleanedBg = await coverTextRegionOnImage(src, {
        x: cx,
        y: cy,
        width: bw,
        height: bh,
      });

      setSearchQuery(detected);
      const id = `ocr-${Date.now()}`;
      const layer: TextLayer = {
        id,
        text: detected,
        x: cx,
        y: cy,
        fontSize: 36,
        color: '#ffffff',
        fontWeight: '800',
        fontFamily: FONT_STACK,
        shadow: true,
        maxWidthPercent: Math.min(90, Math.max(40, Math.round(bw))),
        textAlign: 'center',
      };
      // Replace placeholder / single default layer so OCR becomes the editable overlay
      const nextLayers =
        layers.length === 1 &&
        (layers[0]?.text === initialText || layers[0]?.text === 'Twój Tekst')
          ? [layer]
          : [...layers, layer];
      commitState({
        layers: nextLayers,
        backgroundUrl: cleanedBg,
        activeLayerId: id,
      });
      setSearchStatus(
        `Wykryto i zakryto stary napis. Edytuj / przenieś warstwę: „${detected.slice(0, 40)}${detected.length > 40 ? '…' : ''}”`
      );
    } catch {
      setSearchStatus('Wykrywanie nie powiodło się. Wpisz napis ręcznie i kliknij Znajdź.');
    } finally {
      setIsDetecting(false);
    }
  };

  const removeActiveLayer = () => {
    if (!activeLayerId || layers.length <= 1) {
      setSearchStatus('Zostaw przynajmniej jedną warstwę tekstu.');
      return;
    }
    const next = layers.filter((l) => l.id !== activeLayerId);
    commitState({ layers: next, activeLayerId: next[0]?.id ?? null });
    setSearchStatus('Usunięto warstwę.');
  };

  const handleExport = async () => {
    if (!containerRef.current || !onExport) return;
    setIsExporting(true);
    setGuides({ v: false, h: false });
    setActiveLayerId(null);
    // wait a tick so selection ring disappears from export
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    try {
      const dataUrl = await toPng(containerRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      });
      onExport(dataUrl);
      onClose();
    } catch {
      /* retry */
    } finally {
      setIsExporting(false);
      setActiveLayerId(layers[0]?.id ?? null);
    }
  };

  const activeLayer = layers.find((l) => l.id === activeLayerId);
  const accent = 'var(--hero-accent)';

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-[#071018]/85 p-0 sm:p-4 animate-fade-in">
      <div className="relative w-full max-w-6xl max-h-[96vh] overflow-y-auto flex flex-col lg:flex-row gap-4 lg:gap-6 items-stretch sm:items-start bg-[#0a1220] border border-white/10 rounded-t-2xl sm:rounded-lg p-4 sm:p-5">
        {/* Panel */}
        <div className="w-full lg:w-80 shrink-0 border border-white/10 bg-[#071018] p-5 space-y-5 order-2 lg:order-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                style={{ color: accent }}
              >
                Overlay
              </p>
              <h3 className="mt-1 font-display text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
                <BrandMarkIcon className="w-5 h-5" style={{ color: accent }} />
                Studio napisu
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={undo}
                disabled={historyIndex <= 0}
                className="min-h-[40px] min-w-[40px] rounded-lg border border-white/10 text-xs text-white disabled:opacity-30 hover:bg-white/5"
                title="Cofnij"
              >
                ↶
              </button>
              <button
                type="button"
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className="min-h-[40px] min-w-[40px] rounded-lg border border-white/10 text-xs text-white disabled:opacity-30 hover:bg-white/5"
                title="Ponów"
              >
                ↷
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Zamknij"
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5 touch-manipulation"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Znajdź napis → potem przenieś */}
          <div className="space-y-2 p-3 rounded-lg border border-white/10 bg-[#0a1220]">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 block">
              1. Znajdź napis
            </label>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  findOrCreateLayer();
                }
              }}
              placeholder="np. fragment nagłówka…"
              className="w-full min-h-[44px] bg-[#071018] border border-white/10 rounded-lg px-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[var(--hero-accent)]"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={findOrCreateLayer}
                className="flex-1 min-h-[44px] rounded-lg text-sm font-semibold text-white hover:brightness-110 touch-manipulation"
                style={{ backgroundColor: accent }}
              >
                Znajdź
              </button>
              {userId && (
                <button
                  type="button"
                  onClick={() => void detectTextFromImage()}
                  disabled={isDetecting}
                  className="flex-1 min-h-[44px] rounded-lg border border-white/10 text-xs font-semibold text-slate-200 hover:border-[var(--hero-accent)]/50 disabled:opacity-50 touch-manipulation"
                >
                  {isDetecting ? 'Zakrywam…' : 'Z grafiki + wyczyść'}
                </button>
              )}
            </div>
            {searchStatus && (
              <p className="text-[11px] text-[var(--hero-accent)] leading-snug">{searchStatus}</p>
            )}
            {layers.length > 1 && (
              <ul className="max-h-24 overflow-y-auto space-y-1 pt-1">
                {layers.map((l) => (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveLayerId(l.id);
                        setSearchQuery(l.text);
                        setSearchStatus('Warstwa wybrana — ustaw pozycję w kroku 2.');
                      }}
                      className={`w-full text-left text-[11px] px-2 py-1.5 rounded truncate touch-manipulation ${
                        activeLayerId === l.id
                          ? 'bg-[var(--hero-accent-soft)] text-white'
                          : 'text-slate-400 hover:bg-white/5'
                      }`}
                    >
                      {l.text || '(pusty)'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 block">
              Treść
            </label>
            {activeLayer ? (
              <>
                <textarea
                  value={activeLayer.text}
                  onChange={(e) => updateActiveLayer({ text: e.target.value })}
                  className="w-full min-h-[72px] bg-[#0a1220] border border-white/10 rounded-lg p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--hero-accent)]"
                  rows={3}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-semibold text-slate-500 block">Rozmiar</span>
                    <input
                      type="range"
                      min={12}
                      max={96}
                      value={activeLayer.fontSize}
                      onChange={(e) =>
                        updateActiveLayer({ fontSize: parseInt(e.target.value, 10) })
                      }
                      className="w-full accent-[var(--hero-accent)]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-semibold text-slate-500 block">Kolor</span>
                    <input
                      type="color"
                      value={activeLayer.color}
                      onChange={(e) => updateActiveLayer({ color: e.target.value })}
                      className="w-full h-9 bg-transparent border-none cursor-pointer"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-slate-500 block">
                    Max. szerokość ({activeLayer.maxWidthPercent}%)
                  </span>
                  <input
                    type="range"
                    min={40}
                    max={95}
                    value={activeLayer.maxWidthPercent}
                    onChange={(e) =>
                      updateActiveLayer({ maxWidthPercent: parseInt(e.target.value, 10) })
                    }
                    className="w-full accent-[var(--hero-accent)]"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateActiveLayer({ shadow: !activeLayer.shadow }, true)}
                    className={`flex-1 min-h-[40px] rounded-lg border text-[10px] font-semibold uppercase tracking-wider ${
                      activeLayer.shadow
                        ? 'bg-[var(--hero-accent)] border-transparent text-white'
                        : 'border-white/10 text-slate-400'
                    }`}
                  >
                    Cień
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateActiveLayer(
                        { fontWeight: activeLayer.fontWeight === '800' ? '400' : '800' },
                        true
                      )
                    }
                    className={`flex-1 min-h-[40px] rounded-lg border text-[10px] font-semibold uppercase tracking-wider ${
                      activeLayer.fontWeight === '800'
                        ? 'bg-[var(--hero-accent)] border-transparent text-white'
                        : 'border-white/10 text-slate-400'
                    }`}
                  >
                    Bold
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['left', 'center', 'right'] as const).map((align) => (
                    <button
                      key={align}
                      type="button"
                      onClick={() => updateActiveLayer({ textAlign: align }, true)}
                      className={`min-h-[36px] rounded-lg border text-[10px] font-semibold uppercase ${
                        activeLayer.textAlign === align
                          ? 'bg-[var(--hero-accent)] border-transparent text-white'
                          : 'border-white/10 text-slate-400'
                      }`}
                    >
                      {align === 'left' ? 'L' : align === 'center' ? 'C' : 'P'}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={removeActiveLayer}
                  className="w-full min-h-[36px] rounded-lg border border-red-500/30 text-[10px] font-semibold uppercase text-red-400 hover:bg-red-500/10"
                >
                  Usuń warstwę
                </button>
              </>
            ) : (
              <ModernButton
                size="sm"
                variant="secondary"
                fullWidth
                className="!rounded-lg"
                onClick={() => setActiveLayerId(layers[0]?.id ?? null)}
              >
                Wybierz warstwę tekstu
              </ModernButton>
            )}
          </div>

          <div className="space-y-2 p-3 rounded-lg border border-[var(--hero-accent)]/30 bg-[var(--hero-accent-soft)]/20">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 block">
              2. Przenieś do
            </label>
            {activeLayer ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1">
                    <span className="text-[10px] text-slate-500">X %</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={Math.round(activeLayer.x)}
                      onChange={(e) => {
                        const x = clamp(Number(e.target.value) || 0);
                        updateActiveLayer({ x });
                        setGuides({ v: x === 50, h: activeLayer.y === 50 });
                      }}
                      className="w-full min-h-[40px] rounded-lg bg-[#071018] border border-white/10 px-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--hero-accent)]"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] text-slate-500">Y %</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={Math.round(activeLayer.y)}
                      onChange={(e) => {
                        const y = clamp(Number(e.target.value) || 0);
                        updateActiveLayer({ y });
                        setGuides({ v: activeLayer.x === 50, h: y === 50 });
                      }}
                      className="w-full min-h-[40px] rounded-lg bg-[#071018] border border-white/10 px-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--hero-accent)]"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {POSITION_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyPreset(p.x, p.y)}
                      className="min-h-[40px] rounded-lg border border-white/10 bg-[#071018]/80 text-xs font-semibold text-slate-200 hover:border-[var(--hero-accent)]/50 hover:text-white touch-manipulation"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-1.5 pt-1 max-w-[140px] mx-auto">
                  <span />
                  <button
                    type="button"
                    aria-label="W górę"
                    onClick={() => nudgeActive(0, -1)}
                    className="min-h-[40px] rounded-lg border border-white/10 text-white hover:bg-white/5 touch-manipulation"
                  >
                    ↑
                  </button>
                  <span />
                  <button
                    type="button"
                    aria-label="W lewo"
                    onClick={() => nudgeActive(-1, 0)}
                    className="min-h-[40px] rounded-lg border border-white/10 text-white hover:bg-white/5 touch-manipulation"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    aria-label="W dół"
                    onClick={() => nudgeActive(0, 1)}
                    className="min-h-[40px] rounded-lg border border-white/10 text-white hover:bg-white/5 touch-manipulation"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    aria-label="W prawo"
                    onClick={() => nudgeActive(1, 0)}
                    className="min-h-[40px] rounded-lg border border-white/10 text-white hover:bg-white/5 touch-manipulation"
                  >
                    →
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 text-center">
                  Strzałki · Shift = 8% · lub przeciągnij na kadra
                </p>
              </>
            ) : (
              <p className="text-xs text-slate-500">Najpierw znajdź lub wybierz napis (krok 1).</p>
            )}
          </div>

          {(logoUrl || mascotUrl) && (
            <div className="space-y-2 pt-3 border-t border-white/10">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 block">
                Marka
              </label>
              <div className="grid grid-cols-2 gap-2">
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      setBrandAssets((prev) => ({
                        ...prev,
                        logo: { ...prev.logo, visible: !prev.logo.visible },
                      }))
                    }
                    className={`p-3 rounded-lg border flex flex-col items-center gap-2 ${
                      brandAssets.logo.visible
                        ? 'bg-[var(--hero-accent-soft)] border-[var(--hero-accent)]'
                        : 'border-white/10 opacity-50'
                    }`}
                  >
                    <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain" loading="lazy" />
                    <span className="text-[10px] font-semibold uppercase">Logo</span>
                  </button>
                )}
                {mascotUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      setBrandAssets((prev) => ({
                        ...prev,
                        mascot: { ...prev.mascot, visible: !prev.mascot.visible },
                      }))
                    }
                    className={`p-3 rounded-lg border flex flex-col items-center gap-2 ${
                      brandAssets.mascot.visible
                        ? 'bg-[var(--hero-accent-soft)] border-[var(--hero-accent)]'
                        : 'border-white/10 opacity-50'
                    }`}
                  >
                    <img
                      src={mascotUrl}
                      alt="Maskotka"
                      className="w-8 h-8 object-contain"
                      loading="lazy"
                    />
                    <span className="text-[10px] font-semibold uppercase">Maskotka</span>
                  </button>
                )}
              </div>
            </div>
          )}

          <ModernButton
            variant="primary"
            fullWidth
            loading={isExporting}
            disabled={!onExport || isExporting}
            className="!rounded-lg min-h-[44px]"
            onClick={() => void handleExport()}
          >
            Zapisz grafikę do posta
          </ModernButton>
        </div>

        {/* Canvas */}
        <div className="flex-1 min-w-0 order-1 lg:order-2">
          <div
            ref={containerRef}
            className="relative w-full aspect-square sm:aspect-video bg-black overflow-hidden border border-white/10 select-none touch-none"
            style={{ cursor: draggingType ? 'grabbing' : 'default' }}
          >
            <img
              src={backgroundUrl}
              alt="Tło"
              className="w-full h-full object-contain pointer-events-none"
              draggable={false}
            />

            {guides.v && (
              <div
                className="absolute top-0 bottom-0 w-px z-30 pointer-events-none"
                style={{ left: '50%', backgroundColor: accent, opacity: 0.7 }}
              />
            )}
            {guides.h && (
              <div
                className="absolute left-0 right-0 h-px z-30 pointer-events-none"
                style={{ top: '50%', backgroundColor: accent, opacity: 0.7 }}
              />
            )}

            {logoUrl && brandAssets.logo.visible && (
              <div
                onPointerDown={(e) => handlePointerDown(e, 'logo')}
                className="absolute cursor-grab active:cursor-grabbing touch-none"
                style={{
                  left: `${brandAssets.logo.x}%`,
                  top: `${brandAssets.logo.y}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 15,
                }}
              >
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="w-20 h-20 sm:w-24 sm:h-24 object-contain pointer-events-none"
                  style={{ transform: `scale(${brandAssets.logo.scale})` }}
                  draggable={false}
                />
              </div>
            )}

            {mascotUrl && brandAssets.mascot.visible && (
              <div
                onPointerDown={(e) => handlePointerDown(e, 'mascot')}
                className="absolute cursor-grab active:cursor-grabbing touch-none"
                style={{
                  left: `${brandAssets.mascot.x}%`,
                  top: `${brandAssets.mascot.y}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 15,
                }}
              >
                <img
                  src={mascotUrl}
                  alt="Maskotka"
                  className="w-28 h-28 sm:w-32 sm:h-32 object-contain pointer-events-none"
                  style={{ transform: `scale(${brandAssets.mascot.scale})` }}
                  draggable={false}
                />
              </div>
            )}

            {layers.map((layer) => (
              <div
                key={layer.id}
                onPointerDown={(e) => handlePointerDown(e, 'text', layer.id)}
                className={`absolute cursor-grab active:cursor-grabbing touch-none px-3 py-1.5 transition-shadow ${
                  activeLayerId === layer.id
                    ? 'ring-2 ring-[var(--hero-accent)] z-20'
                    : 'z-10'
                }`}
                style={{
                  left: `${layer.x}%`,
                  top: `${layer.y}%`,
                  fontSize: `${layer.fontSize}px`,
                  color: layer.color,
                  fontWeight: layer.fontWeight,
                  fontFamily: layer.fontFamily,
                  textAlign: layer.textAlign || 'center',
                  textShadow: layer.shadow ? '0 2px 12px rgba(0,0,0,0.85)' : 'none',
                  transform: 'translate(-50%, -50%)',
                  userSelect: 'none',
                  maxWidth: `${layer.maxWidthPercent}%`,
                  width: 'max-content',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  lineHeight: 1.2,
                }}
              >
                {layer.text}
              </div>
            ))}

            <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:bottom-4 px-3 py-2 bg-[#071018]/80 border border-white/10 rounded-lg text-[10px] sm:text-xs text-white/70 text-center sm:text-right pointer-events-none">
              Przeciągnij · strzałki · snap do środka
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
