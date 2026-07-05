import React, { useState, useRef, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { ModernButton } from './ModernButton';
import { SparklesIcon } from '../icons/SparklesIcon';
import { XMarkIcon } from '../icons/XMarkIcon';

interface TextLayer {
    id: string;
    text: string;
    x: number;
    y: number;
    fontSize: number;
    color: string;
    fontWeight: string;
    fontFamily: string;
    shadow: boolean;
}

interface CreativeCanvasProps {
    imageUrl: string;
    initialText?: string;
    logoUrl?: string;
    mascotUrl?: string;
    onExport?: (dataUrl: string) => void;
    onClose: () => void;
}

export const CreativeCanvas: React.FC<CreativeCanvasProps> = ({
    imageUrl,
    initialText = "Twój Tekst",
    logoUrl,
    mascotUrl,
    onExport,
    onClose
}) => {
    const [layers, setLayers] = useState<TextLayer[]>([
        {
            id: '1',
            text: initialText,
            x: 50,
            y: 50,
            fontSize: 32,
            color: '#ffffff',
            fontWeight: '900',
            fontFamily: 'Inter, sans-serif',
            shadow: true
        }
    ]);

    const [brandAssets, setBrandAssets] = useState({
        logo: { visible: !!logoUrl, x: 10, y: 10, scale: 1 },
        mascot: { visible: !!mascotUrl, x: 90, y: 90, scale: 1 }
    });

    const [activeLayerId, setActiveLayerId] = useState<string | null>('1');
    const [draggingType, setDraggingType] = useState<'text' | 'logo' | 'mascot' | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        if (!containerRef.current || !onExport) return;
        setIsExporting(true);
        try {
            const dataUrl = await toPng(containerRef.current, {
                cacheBust: true,
                pixelRatio: 2,
            });
            onExport(dataUrl);
            onClose();
        } catch {
            // export failed silently — user can retry
        } finally {
            setIsExporting(false);
        }
    };

    const handleMouseDown = (e: React.MouseEvent, type: 'text' | 'logo' | 'mascot', id?: string) => {
        if (id) setActiveLayerId(id);
        setDraggingType(type);

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!draggingType || !containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - containerRect.left - dragOffset.x) / containerRect.width) * 100;
        const y = ((e.clientY - containerRect.top - dragOffset.y) / containerRect.height) * 100;

        if (draggingType === 'text' && activeLayerId) {
            setLayers(prev => prev.map(l => l.id === activeLayerId ? { ...l, x, y } : l));
        } else if (draggingType === 'logo') {
            setBrandAssets(prev => ({ ...prev, logo: { ...prev.logo, x, y } }));
        } else if (draggingType === 'mascot') {
            setBrandAssets(prev => ({ ...prev, mascot: { ...prev.mascot, x, y } }));
        }
    };

    const handleMouseUp = () => {
        setDraggingType(null);
    };

    const updateActiveLayer = (updates: Partial<TextLayer>) => {
        if (!activeLayerId) return;
        setLayers(prev => prev.map(l =>
            l.id === activeLayerId ? { ...l, ...updates } : l
        ));
    };

    const activeLayer = layers.find(l => l.id === activeLayerId);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4 animate-fade-in">
            <div className="relative w-full max-w-6xl flex flex-col lg:flex-row gap-8 items-start">

                {/* Panel boczny narzędzi */}
                <div className="w-full lg:w-80 glass p-6 rounded-[2rem] border border-white/10 space-y-6 animate-fade-in-right overflow-y-auto max-h-[90vh]">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-black text-white flex items-center gap-2">
                            <SparklesIcon className="w-5 h-5 text-blue-400" />
                            Studio Designu
                        </h3>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                            <XMarkIcon className="w-6 h-6 text-slate-400" />
                        </button>
                    </div>

                    <div className="space-y-6">
                        {/* Tekst Section */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Warstwa Tekstu</label>
                            {activeLayer ? (
                                <>
                                    <textarea
                                        value={activeLayer.text}
                                        onChange={(e) => updateActiveLayer({ text: e.target.value })}
                                        className="w-full bg-slate-800/50 border border-white/10 rounded-xl p-3 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        rows={2}
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <span className="text-[10px] font-bold text-slate-600 block">ROZMIAR</span>
                                            <input
                                                type="range" min="12" max="100"
                                                value={activeLayer.fontSize}
                                                onChange={(e) => updateActiveLayer({ fontSize: parseInt(e.target.value) })}
                                                className="w-full accent-blue-500"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <span className="text-[10px] font-bold text-slate-600 block">KOLOR</span>
                                            <input
                                                type="color"
                                                value={activeLayer.color}
                                                onChange={(e) => updateActiveLayer({ color: e.target.value })}
                                                className="w-full h-8 bg-transparent border-none outline-none cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => updateActiveLayer({ shadow: !activeLayer.shadow })} className={`flex-1 p-2 rounded-lg border border-white/10 text-[10px] font-black tracking-widest uppercase transition-all ${activeLayer.shadow ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Cień</button>
                                        <button onClick={() => updateActiveLayer({ fontWeight: activeLayer.fontWeight === '900' ? '400' : '900' })} className={`flex-1 p-2 rounded-lg border border-white/10 text-[10px] font-black tracking-widest uppercase transition-all ${activeLayer.fontWeight === '900' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Bold</button>
                                    </div>
                                </>
                            ) : (
                                <ModernButton size="sm" variant="secondary" fullWidth onClick={() => setActiveLayerId(layers[0].id)}>Wybierz tekst</ModernButton>
                            )}
                        </div>

                        {/* Brand Assets Section */}
                        {(logoUrl || mascotUrl) && (
                            <div className="space-y-4 pt-4 border-t border-white/5">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Moja Marka</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {logoUrl && (
                                        <button
                                            onClick={() => setBrandAssets(prev => ({ ...prev, logo: { ...prev.logo, visible: !prev.logo.visible } }))}
                                            className={`p-3 rounded-2xl border transition-all flex flex-col items-center gap-2 ${brandAssets.logo.visible ? 'bg-blue-600/20 border-blue-500' : 'bg-white/5 border-white/10 opacity-50'}`}
                                        >
                                            <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain" loading="lazy" />
                                            <span className="text-[10px] font-black uppercase">Logo</span>
                                        </button>
                                    )}
                                    {mascotUrl && (
                                        <button
                                            onClick={() => setBrandAssets(prev => ({ ...prev, mascot: { ...prev.mascot, visible: !prev.mascot.visible } }))}
                                            className={`p-3 rounded-2xl border transition-all flex flex-col items-center gap-2 ${brandAssets.mascot.visible ? 'bg-blue-600/20 border-blue-500' : 'bg-white/5 border-white/10 opacity-50'}`}
                                        >
                                            <img src={mascotUrl} alt="Maskotka" className="w-8 h-8 object-contain" loading="lazy" />
                                            <span className="text-[10px] font-black uppercase">Maskotka</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t border-white/5">
                        <ModernButton
                            variant="gradient"
                            fullWidth
                            loading={isExporting}
                            disabled={!onExport || isExporting}
                            onClick={() => void handleExport()}
                        >
                            Zapisz grafikę do posta
                        </ModernButton>
                    </div>
                </div>

                {/* Obszar roboczy */}
                <div
                    ref={containerRef}
                    className="relative flex-grow aspect-square lg:aspect-video bg-black rounded-[3rem] overflow-hidden shadow-2xl border border-white/10 select-none cursor-crosshair group"
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    <img
                        src={imageUrl}
                        alt="Background"
                        className="w-full h-full object-contain pointer-events-none"
                    />

                    {/* Logo Layer */}
                    {logoUrl && brandAssets.logo.visible && (
                        <div
                            onMouseDown={(e) => handleMouseDown(e, 'logo')}
                            className="absolute cursor-move group/logo"
                            style={{ left: `${brandAssets.logo.x}%`, top: `${brandAssets.logo.y}%`, transform: 'translate(-50%, -50%)', zIndex: 15 }}
                        >
                            <img src={logoUrl} alt="Brand Logo" className="w-24 h-24 object-contain shadow-2xl" style={{ transform: `scale(${brandAssets.logo.scale})` }} />
                            <div className="absolute -inset-2 border-2 border-blue-500/0 group-hover/logo:border-blue-500/50 rounded-xl transition-all" />
                        </div>
                    )}

                    {/* Mascot Layer */}
                    {mascotUrl && brandAssets.mascot.visible && (
                        <div
                            onMouseDown={(e) => handleMouseDown(e, 'mascot')}
                            className="absolute cursor-move group/mascot"
                            style={{ left: `${brandAssets.mascot.x}%`, top: `${brandAssets.mascot.y}%`, transform: 'translate(-50%, -50%)', zIndex: 15 }}
                        >
                            <img src={mascotUrl} alt="Brand Mascot" className="w-32 h-32 object-contain drop-shadow-2xl" style={{ transform: `scale(${brandAssets.mascot.scale})` }} />
                            <div className="absolute -inset-2 border-2 border-blue-500/0 group-hover/mascot:border-blue-500/50 rounded-xl transition-all" />
                        </div>
                    )}

                    {layers.map(layer => (
                        <div
                            key={layer.id}
                            onMouseDown={(e) => handleMouseDown(e, 'text', layer.id)}
                            className={`absolute cursor-move px-4 py-2 rounded-lg transition-shadow whitespace-pre-wrap ${activeLayerId === layer.id ? 'ring-2 ring-blue-500 shadow-2xl z-20' : 'hover:ring-1 hover:ring-white/30 z-10'}`}
                            style={{
                                left: `${layer.x}%`,
                                top: `${layer.y}%`,
                                fontSize: `${layer.fontSize}px`,
                                color: layer.color,
                                fontWeight: layer.fontWeight,
                                fontFamily: layer.fontFamily,
                                textShadow: layer.shadow ? '2px 2px 10px rgba(0,0,0,0.8)' : 'none',
                                transform: 'translate(-50%, -50%)',
                                userSelect: 'none'
                            }}
                        >
                            {layer.text}
                        </div>
                    ))}

                    <div className="absolute bottom-6 right-6 px-4 py-2 bg-black/50 backdrop-blur-md rounded-full text-xs text-white/70 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                        Przeciągnij elementy, aby zmienić pozycję
                    </div>
                </div>
            </div>
        </div>
    );
};
