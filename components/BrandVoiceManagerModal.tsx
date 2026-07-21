import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { useConfirm } from '../hooks/useConfirm';
import { ToneArchetype, BrandVoiceProfile } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { PencilIcon } from './icons/PencilIcon';
import { IdentificationIcon } from './icons/IdentificationIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { BulbIcon } from './icons/BulbIcon';
import { UserIcon } from './icons/UserIcon';
import { RocketIcon } from './icons/RocketIcon';
import { HeartIcon } from './icons/HeartIcon';
import { ArchiveBoxIcon } from './icons/ArchiveBoxIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { ModernButton } from './ui/ModernButton';
import { ModernInput } from './ui/ModernInput';
import { ModernCard } from './ui/ModernCard';
import { uploadBrandAsset } from '../services/storageService';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationType } from '../types';
import { PhotoIcon } from './icons/PhotoIcon';
import { computeBrandVoiceCompleteness } from '../utils/brandVoiceLearn';
import { UsersIcon } from './icons/UsersIcon';
import { useEscapeClose } from '../hooks/useEscapeClose';

interface BrandVoiceManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    profiles: BrandVoiceProfile[];
    onSave: (profile: BrandVoiceProfile) => void;
    onDelete: (id: string) => void;
    onSetActive: (id: string | null) => void;
    activeId: string | null;
    onLearnFromFavorites: (mergeIntoProfileId?: string | null) => Promise<void>;
    onLearnFromHistory?: (mergeIntoProfileId?: string | null) => Promise<void>;
    onLearnFromCompetitors?: (mergeIntoProfileId?: string | null) => Promise<void>;
    onExtractFromUrl?: (url: string, mergeIntoProfileId?: string | null) => Promise<void>;
    isLearningStyle: boolean;
}

const emptyProfile: BrandVoiceProfile = {
    id: '',
    name: '',
    userId: '',
    teamId: null,
    settings: {
        brandName: '',
        description: '',
        keywords: '',
        avoid: '',
        archetype: ToneArchetype.Expert,
        examplesToFollow: [],
        examplesToAvoid: [],
        logoUrl: '',
        mascotUrl: '',
        mascotName: '',
        mascotDescription: '',
        includeMascotInGeneration: false,
        websiteUrl: '',
        visualStyle: '',
        brandColors: [],
        logoPosition: 'bottom-right',
        logoSizePercent: 13,
    }
};

const LOGO_POSITIONS = [
    { id: 'top-left' as const, label: '↖ Góra lewo' },
    { id: 'top-right' as const, label: '↗ Góra prawo' },
    { id: 'bottom-left' as const, label: '↙ Dół lewo' },
    { id: 'bottom-right' as const, label: '↘ Dół prawo' },
];

const ARCHETYPES = [
    { id: ToneArchetype.Expert, icon: BriefcaseIcon, label: 'Ekspert', desc: 'Autorytet i wiedza' },
    { id: ToneArchetype.Friend, icon: HeartIcon, label: 'Przyjaciel', desc: 'Bliskość i wsparcie' },
    { id: ToneArchetype.Innovator, icon: RocketIcon, label: 'Innowator', desc: 'Przyszłość i wizja' },
    { id: ToneArchetype.Rebel, icon: ArchiveBoxIcon, label: 'Buntownik', desc: 'Odwaga i zmiana' },
    { id: ToneArchetype.Sage, icon: BulbIcon, label: 'Mędrzec', desc: 'Mądrość i prawda' },
    { id: ToneArchetype.Entertainer, icon: SparklesIcon, label: 'Rozbawiacz', desc: 'Radość i zabawa' },
];


const ProfileForm: React.FC<{
    profile: Partial<BrandVoiceProfile>;
    onSave: (profileData: BrandVoiceProfile) => void;
    onCancel: () => void;
}> = ({ profile, onSave, onCancel }) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState<BrandVoiceProfile>(() => {
        const initialSettings = { ...emptyProfile.settings, ...profile?.settings };
        return {
            id: profile?.id || `bv-${Date.now()}`,
            name: profile?.name || '',
            userId: profile?.userId || '',
            settings: {
                ...initialSettings,
                brandName: initialSettings.brandName ?? '',
                description: initialSettings.description ?? '',
                keywords: initialSettings.keywords ?? '',
                avoid: initialSettings.avoid ?? '',
                examplesToFollow: initialSettings.examplesToFollow || [],
                examplesToAvoid: initialSettings.examplesToAvoid || [],
            },
            teamId: profile?.teamId !== undefined ? profile.teamId : null
        };
    });

    useEffect(() => {
        const initialSettings = { ...emptyProfile.settings, ...profile?.settings };
        setFormData({
            id: profile?.id || `bv-${Date.now()}`,
            name: profile?.name || '',
            userId: profile?.userId || '',
            settings: {
                ...initialSettings,
                brandName: initialSettings.brandName ?? '',
                description: initialSettings.description ?? '',
                keywords: initialSettings.keywords ?? '',
                avoid: initialSettings.avoid ?? '',
                examplesToFollow: initialSettings.examplesToFollow || [],
                examplesToAvoid: initialSettings.examplesToAvoid || [],
            },
            teamId: profile?.teamId !== undefined ? profile.teamId : null
        });
    }, [profile]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'name') {
            setFormData(prev => ({ ...prev, name: value }));
        } else {
            setFormData(prev => ({
                ...prev,
                settings: { ...prev.settings, [name]: value }
            }));
        }
    };

    const handleExampleChange = (type: 'examplesToFollow' | 'examplesToAvoid', index: number, value: string) => {
        setFormData(prev => {
            const newExamples = [...(prev.settings[type] || [])];
            newExamples[index] = value;
            return {
                ...prev,
                settings: {
                    ...prev.settings,
                    [type]: newExamples,
                }
            };
        });
    };

    const addExample = (type: 'examplesToFollow' | 'examplesToAvoid') => {
        setFormData(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                [type]: [...(prev.settings[type] || []), ''],
            }
        }));
    };

    const removeExample = (type: 'examplesToFollow' | 'examplesToAvoid', index: number) => {
        setFormData(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                [type]: (prev.settings[type] || []).filter((_, i) => i !== index),
            }
        }));
    };

    const { user } = useAuth();
    const { addToast } = useNotifications();
    const [isUploading, setIsUploading] = useState<string | null>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logos' | 'mascots') => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setIsUploading(type);
        try {
            const publicUrl = await uploadBrandAsset(file, type, user.id);
            const fieldName = type === 'logos' ? 'logoUrl' : 'mascotUrl';
            setFormData(prev => ({
                ...prev,
                settings: { ...prev.settings, [fieldName]: publicUrl }
            }));
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Błąd podczas wgrywania pliku';
            addToast(errorMessage, NotificationType.Error);
        } finally {
            setIsUploading(null);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const completeness = computeBrandVoiceCompleteness(formData.settings);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tighter">
                    {profile.id ? 'Edytuj Tożsamość' : 'Nowa Tożsamość Marki'}
                </h3>
                <div className="flex gap-2">
                    <ModernButton onClick={onCancel} variant="ghost" size="sm">Anuluj</ModernButton>
                    <ModernButton onClick={() => onSave(formData)} variant="primary" size="sm">Zapisz Profil</ModernButton>
                </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Kompletność profilu</span>
                    <span className="text-sm font-extrabold text-[var(--hero-accent)]">{completeness.score}%</span>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--hero-accent)] transition-all" style={{ width: `${completeness.score}%` }} />
                </div>
                {completeness.missing.length > 0 && (
                    <p className="text-[10px] text-slate-500 mt-2">Brakuje: {completeness.missing.slice(0, 4).join(', ')}</p>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="space-y-4">
                        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Podstawowe Dane</label>
                        <ModernInput
                            label="Nazwa Profilu"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="np. Sklep z Pierogami - Oficjalny"
                        />
                        <ModernInput
                            label="Nazwa Marki"
                            name="brandName"
                            value={formData.settings.brandName}
                            onChange={handleChange}
                            placeholder="np. Pierogarnia u Jana"
                        />
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Opis Marki (Kontekst dla AI)</label>
                            <textarea
                                name="description"
                                value={formData.settings.description}
                                onChange={handleChange}
                                rows={4}
                                className="w-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-lg p-4 text-sm focus:border-[var(--hero-accent)] transition-all outline-none"
                                placeholder="Czym zajmuje się Twoja marka? Jaka jest jej misja?"
                            />
                        </div>
                        <ModernInput
                            label="URL strony (link w CTA)"
                            name="websiteUrl"
                            value={formData.settings.websiteUrl || ''}
                            onChange={handleChange}
                            placeholder="https://twojafirma.pl"
                        />
                        <ModernInput
                            label="Słowa kluczowe marki"
                            name="keywords"
                            value={formData.settings.keywords}
                            onChange={handleChange}
                            placeholder="np. jakość, lokalnie, tradycja, rodzinna atmosfera"
                        />
                        <ModernInput
                            label="Unikaj (słowa i tematy)"
                            name="avoid"
                            value={formData.settings.avoid}
                            onChange={handleChange}
                            placeholder="np. tanio, promocja -50%, agresywna sprzedaż"
                        />
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Styl wizualny grafik (AI)</label>
                            <textarea
                                name="visualStyle"
                                value={formData.settings.visualStyle || ''}
                                onChange={handleChange}
                                rows={2}
                                className="w-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-lg p-4 text-sm focus:border-[var(--hero-accent)] transition-all outline-none"
                                placeholder="np. jasne zdjęcia, minimalistyczny styl, kolory marki, ciepłe światło"
                            />
                        </div>
                        <ModernInput
                            label="Kolory marki (hex, po przecinku)"
                            name="brandColors"
                            value={(formData.settings.brandColors || []).join(', ')}
                            onChange={(e) => {
                                const colors = e.target.value.split(',').map((c) => c.trim()).filter(Boolean);
                                setFormData((prev) => ({
                                    ...prev,
                                    settings: { ...prev.settings, brandColors: colors },
                                }));
                            }}
                            placeholder="#1a56db, #f59e0b"
                        />
                    </div>

                    <div className="space-y-4">
                        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Archetyp Osobowości</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {ARCHETYPES.map((arch) => (
                                <button
                                    key={arch.id}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, settings: { ...prev.settings, archetype: arch.id } }))}
                                    className={`p-4 rounded-lg border-2 transition-all text-left flex flex-col gap-2 ${formData.settings.archetype === arch.id ? 'bg-[var(--hero-accent)] border-[var(--hero-accent)] text-white' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-[var(--hero-accent)] group'}`}
                                >
                                    <arch.icon className={`w-6 h-6 ${formData.settings.archetype === arch.id ? 'text-white' : 'text-blue-500 group-hover:scale-110 transition-transform'}`} />
                                    <div>
                                        <p className="text-xs font-extrabold uppercase tracking-tight">{arch.label}</p>
                                        <p className={`text-[10px] leading-tight ${formData.settings.archetype === arch.id ? 'text-blue-100' : 'text-slate-500'}`}>{arch.desc}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="p-8 bg-slate-900 dark:bg-slate-950 rounded-lg border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-700">
                            <RocketIcon className="w-24 h-24 text-blue-500" />
                        </div>
                        <div className="relative z-10 space-y-6">
                            <h4 className="text-xl font-extrabold text-white uppercase tracking-tighter flex items-center gap-3">
                                <SparklesIcon className="w-6 h-6 text-blue-400" />
                                Wizualne Aktywa
                            </h4>
                            <div className="space-y-2">
                                <label className="text-xs font-extrabold text-white/50 uppercase tracking-widest block mb-2">Logo Marki</label>
                                <div className="flex items-center gap-4 p-4 bg-white/5 rounded-3xl border border-white/10 group-hover:border-[var(--hero-accent)]/50 transition-all">
                                    <div className="w-16 h-16 rounded-lg bg-slate-800 flex items-center justify-center overflow-hidden border border-white/10">
                                        {formData.settings.logoUrl ? (
                                            <img src={formData.settings.logoUrl} alt="Logo" className="w-full h-full object-contain" loading="lazy" />
                                        ) : (
                                            <PhotoIcon className="w-8 h-8 text-slate-600" />
                                        )}
                                    </div>
                                    <div className="flex-grow space-y-2">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleFileUpload(e, 'logos')}
                                            className="hidden"
                                            id="logo-upload"
                                        />
                                        <label
                                            htmlFor="logo-upload"
                                            className={`inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-[0.14em] cursor-pointer transition-all ${isUploading === 'logos' ? 'bg-slate-700 text-slate-400' : 'bg-[var(--hero-accent)] text-white hover:brightness-110'}`}
                                        >
                                            {isUploading === 'logos' ? 'Wgrywanie...' : 'Wgraj Logo'}
                                        </label>
                                        <p className="text-[10px] text-slate-500">PNG, JPG lub SVG (max 2MB)</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-extrabold text-white/50 uppercase tracking-widest">Pozycja logo</label>
                                        <select
                                            value={formData.settings.logoPosition || 'bottom-right'}
                                            onChange={(e) => setFormData((prev) => ({
                                                ...prev,
                                                settings: {
                                                    ...prev.settings,
                                                    logoPosition: e.target.value as BrandVoiceProfile['settings']['logoPosition'],
                                                },
                                            }))}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-xs text-white"
                                        >
                                            {LOGO_POSITIONS.map((p) => (
                                                <option key={p.id} value={p.id}>{p.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-extrabold text-white/50 uppercase tracking-widest">
                                            Rozmiar logo ({formData.settings.logoSizePercent ?? 13}%)
                                        </label>
                                        <input
                                            type="range"
                                            min={8}
                                            max={22}
                                            value={formData.settings.logoSizePercent ?? 13}
                                            onChange={(e) => setFormData((prev) => ({
                                                ...prev,
                                                settings: { ...prev.settings, logoSizePercent: Number(e.target.value) },
                                            }))}
                                            className="w-full accent-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 bg-white/5 rounded-3xl border border-white/10 space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-extrabold text-white/30 uppercase tracking-widest">Maskotka Marki</label>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, settings: { ...prev.settings, includeMascotInGeneration: !prev.settings.includeMascotInGeneration } }))}
                                        className={`w-12 h-6 rounded-full transition-all relative ${formData.settings.includeMascotInGeneration ? 'bg-[var(--hero-accent)]' : 'bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.settings.includeMascotInGeneration ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="w-20 h-20 rounded-lg bg-slate-800 flex items-center justify-center overflow-hidden border border-white/10">
                                        {formData.settings.mascotUrl ? (
                                            <img src={formData.settings.mascotUrl} alt="Mascot" className="w-full h-full object-contain" loading="lazy" />
                                        ) : (
                                            <UserIcon className="w-10 h-10 text-slate-600" />
                                        )}
                                    </div>
                                    <div className="flex-grow space-y-2">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleFileUpload(e, 'mascots')}
                                            className="hidden"
                                            id="mascot-upload"
                                        />
                                        <label
                                            htmlFor="mascot-upload"
                                            className={`inline-flex items-center px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-[0.14em] cursor-pointer transition-all ${isUploading === 'mascots' ? 'bg-slate-700 text-slate-400' : 'bg-[var(--hero-accent)] text-white hover:brightness-110'}`}
                                        >
                                            {isUploading === 'mascots' ? 'Wgrywanie...' : 'Wgraj Maskotkę'}
                                        </label>
                                    </div>
                                </div>
                                <ModernInput
                                    label="Imię Maskotki"
                                    name="mascotName"
                                    value={formData.settings.mascotName || ''}
                                    onChange={handleChange}
                                    className="bg-white/5 border-white/10 text-white"
                                />
                                <textarea
                                    name="mascotDescription"
                                    value={formData.settings.mascotDescription || ''}
                                    onChange={handleChange}
                                    rows={2}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-4 text-xs text-white outline-none focus:border-[var(--hero-accent)] transition-all"
                                    placeholder="Opisz maskotkę dla AI gen-grafiki..."
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 md:col-span-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Przykłady (Long-term Learn)</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-6 bg-green-50/50 dark:bg-green-900/10 rounded-3xl border border-green-100 dark:border-green-800/30">
                            <p className="text-xs font-extrabold text-green-700 dark:text-green-400 uppercase tracking-widest mb-4">Używaj takich sformułowań:</p>
                            <div className="space-y-3">
                                {formData.settings.examplesToFollow?.map((ex, i) => (
                                    <div key={`follow-${i}`} className="flex gap-2">
                                        <input value={ex} onChange={e => handleExampleChange('examplesToFollow', i, e.target.value)} className="flex-grow bg-white dark:bg-slate-900 border-none rounded-xl p-2 text-xs" />
                                        <button type="button" onClick={() => removeExample('examplesToFollow', i)} aria-label="Usuń przykład" className="text-red-400 hover:text-red-600">&times;</button>
                                    </div>
                                ))}
                                <button type="button" onClick={() => addExample('examplesToFollow')} className="text-[10px] font-extrabold text-green-600 uppercase">+ Dodaj przykład</button>
                            </div>
                        </div>
                        <div className="p-6 bg-red-50/50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-800/30">
                            <p className="text-xs font-extrabold text-red-700 dark:text-red-400 uppercase tracking-widest mb-4">Unikaj takich sformułowań:</p>
                            <div className="space-y-3">
                                {formData.settings.examplesToAvoid?.map((ex, i) => (
                                    <div key={`avoid-${i}`} className="flex gap-2">
                                        <input value={ex} onChange={e => handleExampleChange('examplesToAvoid', i, e.target.value)} className="flex-grow bg-white dark:bg-slate-900 border-none rounded-xl p-2 text-xs" />
                                        <button type="button" onClick={() => removeExample('examplesToAvoid', i)} aria-label="Usuń przykład" className="text-red-400 hover:text-red-600">&times;</button>
                                    </div>
                                ))}
                                <button type="button" onClick={() => addExample('examplesToAvoid')} className="text-[10px] font-extrabold text-red-600 uppercase">+ Dodaj przykład</button>
                            </div>
                        </div>
                    </div>
                    {(formData.settings.successPatterns?.length ?? 0) > 0 && (
                        <div className="p-4 bg-amber-50/50 dark:bg-amber-900/10 rounded-lg border border-amber-100 dark:border-amber-800/30">
                            <p className="text-[10px] font-extrabold text-amber-700 uppercase tracking-widest mb-2">Wzorce sukcesu (z analizy postów)</p>
                            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1 list-disc pl-4">
                                {formData.settings.successPatterns?.map((p, i) => (
                                    <li key={`pattern-${i}`}>{p}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {formData.settings.competitorIntel && (
                        <div className="p-4 bg-[var(--hero-accent-soft)] rounded-lg border border-[var(--hero-accent)]/20 space-y-3">
                            <p className="text-[10px] font-extrabold text-[var(--hero-accent)] uppercase tracking-widest flex items-center gap-2">
                                <UsersIcon className="w-4 h-4" />
                                Intel konkurencji
                                <span className="text-slate-400 font-normal normal-case">
                                    ({formData.settings.competitorIntel.trackedHandles.join(', ')})
                                </span>
                            </p>
                            <p className="text-xs text-slate-700 dark:text-slate-300">{formData.settings.competitorIntel.summary}</p>
                            {formData.settings.competitorIntel.exploitGaps.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Luki do wykorzystania</p>
                                    <ul className="text-xs text-slate-600 dark:text-slate-400 list-disc pl-4 space-y-0.5">
                                        {formData.settings.competitorIntel.exploitGaps.slice(0, 5).map((g, i) => (
                                            <li key={`gap-${i}`}>{g}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {formData.settings.competitorIntel.avoidCompetitorPatterns.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-bold text-red-600 uppercase mb-1">Nie kopiuj u konkurentów</p>
                                    <ul className="text-xs text-slate-600 dark:text-slate-400 list-disc pl-4 space-y-0.5">
                                        {formData.settings.competitorIntel.avoidCompetitorPatterns.slice(0, 4).map((g, i) => (
                                            <li key={`avoid-${i}`}>{g}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const BrandVoiceManagerModal: React.FC<BrandVoiceManagerModalProps> = ({ isOpen, onClose, profiles, onSave, onDelete, onSetActive, activeId, onLearnFromFavorites, onLearnFromHistory, onLearnFromCompetitors, onExtractFromUrl, isLearningStyle }) => {
    const [editingProfile, setEditingProfile] = useState<Partial<BrandVoiceProfile> | null>(null);
    const [extractUrl, setExtractUrl] = useState('');
    const { t } = useTranslation();
    const { confirm, confirmDialogProps } = useConfirm();
    useEscapeClose(isOpen, onClose);

    useEffect(() => {
        if (!isOpen) {
            setEditingProfile(null);
        }
    }, [isOpen]);

    const handleSave = (profileData: BrandVoiceProfile) => {
        onSave(profileData);
        setEditingProfile(null);
    };

    const handleLearnHistory = async () => {
        if (!onLearnFromHistory) return;
        if (activeId) {
            const merge = await confirm({
                title: 'Ucz się z historii',
                message: 'Uzupełnić aktywny profil (zachowując logo i URL), czy utworzyć nowy?',
                confirmLabel: 'Uzupełnij aktywny',
                cancelLabel: 'Nowy profil',
            });
            await onLearnFromHistory(merge ? activeId : null);
        } else {
            await onLearnFromHistory(null);
        }
    };

    const handleLearnFavorites = async () => {
        if (activeId) {
            const merge = await confirm({
                title: 'Ucz się z ulubionych',
                message: 'Uzupełnić aktywny profil, czy utworzyć nowy?',
                confirmLabel: 'Uzupełnij aktywny',
                cancelLabel: 'Nowy profil',
            });
            await onLearnFromFavorites(merge ? activeId : null);
        } else {
            await onLearnFromFavorites(null);
        }
    };

    const handleExtract = async () => {
        if (!onExtractFromUrl || !extractUrl.trim()) return;
        if (activeId) {
            const merge = await confirm({
                title: 'Import ze strony',
                message: 'Uzupełnić aktywny profil danymi ze strony?',
                confirmLabel: 'Uzupełnij aktywny',
                cancelLabel: 'Nowy profil',
            });
            await onExtractFromUrl(extractUrl.trim(), merge ? activeId : null);
        } else {
            await onExtractFromUrl(extractUrl.trim(), null);
        }
        setExtractUrl('');
    };

    const handleLearnCompetitors = async () => {
        if (!onLearnFromCompetitors) return;
        if (activeId) {
            const merge = await confirm({
                title: 'Ucz się z konkurencji',
                message: 'Uzupełnić aktywny profil Brand Voice danymi z analizy konkurentów?',
                confirmLabel: 'Uzupełnij aktywny',
                cancelLabel: 'Nowy profil',
            });
            await onLearnFromCompetitors(merge ? activeId : null);
        } else {
            await onLearnFromCompetitors(null);
        }
    };

    const handleDelete = async (id: string) => {
        const confirmed = await confirm({
            title: t('brandVoiceManager.deleteConfirmTitle', 'Usuń profil'),
            message: t('brandVoiceManager.deleteConfirm'),
            variant: 'danger',
            confirmLabel: t('common.delete', 'Usuń'),
        });
        if (confirmed) onDelete(id);
    };

    if (!isOpen) {
        return <ConfirmDialog {...confirmDialogProps} />;
    }

    return (
        <>
        <ConfirmDialog {...confirmDialogProps} />
        <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl flex items-center justify-center z-[100] transition-all p-4 lg:p-8"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="brand-voice-modal-title"
                className="bg-white dark:bg-[#0a1220] border border-slate-200 dark:border-white/10 rounded-lg shadow-xl w-full max-w-7xl flex flex-col max-h-[92vh] overflow-hidden animate-scale-in"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 lg:p-8 pb-4 flex justify-between items-center border-b border-slate-200/80 dark:border-white/10 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg text-white" style={{ backgroundColor: 'var(--hero-accent)' }}>
                            <IdentificationIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--hero-accent)' }}>Brand</p>
                            <h2 id="brand-voice-modal-title" className="font-display text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Tożsamość Marki</h2>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-[0.14em]">Brand Voice & Assets</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Zamknij"
                        className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-red-500 hover:text-white transition-colors"
                    >
                        &times;
                    </button>
                </div>

                <div className="p-6 lg:p-8 overflow-y-auto custom-scrollbar flex-grow">
                    {editingProfile ? (
                        <ProfileForm profile={editingProfile} onSave={handleSave} onCancel={() => setEditingProfile(null)} />
                    ) : (
                        <div className="space-y-8">
                            {onExtractFromUrl && (
                                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-lg border-2 border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
                                    <input
                                        type="url"
                                        value={extractUrl}
                                        onChange={(e) => setExtractUrl(e.target.value)}
                                        placeholder="https://twojafirma.pl — importuj styl ze strony"
                                        className="flex-grow bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-[var(--hero-accent)]"
                                    />
                                    <ModernButton
                                        onClick={() => void handleExtract()}
                                        disabled={isLearningStyle || !extractUrl.trim()}
                                        variant="secondary"
                                        loading={isLearningStyle}
                                    >
                                        Importuj ze strony
                                    </ModernButton>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                <button
                                    onClick={() => setEditingProfile(emptyProfile)}
                                    className="p-8 text-white flex flex-col items-center justify-center gap-4 min-h-[180px] h-full hover:brightness-110 transition-all group" style={{ backgroundColor: 'var(--hero-accent)' }}
                                >
                                    <div className="p-3 bg-white/20 rounded-lg group-hover:rotate-12 transition-transform">
                                        <PlusCircleIcon className="w-8 h-8" />
                                    </div>
                                    <span className="font-semibold uppercase tracking-[0.14em] text-sm text-white">{t('brandVoiceManager.addNewProfile')}</span>
                                </button>

                                <button
                                    onClick={() => void handleLearnHistory()}
                                    disabled={isLearningStyle}
                                    className="p-8 bg-white dark:bg-[#071018] rounded-lg border border-slate-200 dark:border-white/10 flex flex-col items-center justify-center gap-4 min-h-[180px] h-full hover:border-[var(--hero-accent)] transition-colors group"
                                >
                                    <div className="p-3 bg-[var(--hero-accent-soft)] rounded-lg text-[var(--hero-accent)] group-hover:scale-110 transition-transform">
                                        <SparklesIcon className="w-8 h-8" />
                                    </div>
                                    <span className="font-semibold uppercase tracking-[0.14em] text-sm text-slate-800 dark:text-white">Ucz się z Historii</span>
                                </button>

                                <button
                                    onClick={() => void handleLearnFavorites()}
                                    disabled={isLearningStyle}
                                    className="p-8 text-white flex flex-col items-center justify-center gap-4 min-h-[180px] h-full hover:brightness-110 transition-all group border border-white/10" style={{ backgroundColor: 'var(--hero-navy)' }}
                                >
                                    <div className="p-3 bg-white/20 rounded-lg group-hover:animate-pulse">
                                        <HeartIcon className="w-8 h-8" />
                                    </div>
                                    <span className="font-semibold uppercase tracking-[0.14em] text-sm text-white">Ucz się z Ulubionych</span>
                                </button>

                                {onLearnFromCompetitors && (
                                    <button
                                        onClick={() => void handleLearnCompetitors()}
                                        disabled={isLearningStyle}
                                        className="p-8 text-white flex flex-col items-center justify-center gap-4 min-h-[180px] h-full hover:brightness-110 transition-all group" style={{ backgroundColor: 'var(--hero-accent)' }}
                                    >
                                        <div className="p-3 bg-white/20 rounded-lg group-hover:scale-110 transition-transform">
                                            <UsersIcon className="w-8 h-8" />
                                        </div>
                                        <span className="font-semibold uppercase tracking-[0.14em] text-sm text-white text-center">Ucz się z Konkurencji</span>
                                    </button>
                                )}
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Aktywne Profile Głosowe</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {profiles.length === 0 ? (
                                        <div className="col-span-full py-12 flex flex-col items-center gap-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-800">
                                            <ArchiveBoxIcon className="w-12 h-12 text-slate-300" />
                                            <p className="text-slate-400 font-medium">Brak zdefiniowanych profili marki.</p>
                                        </div>
                                    ) : (
                                        profiles.map(profile => (
                                            <div
                                                key={profile.id}
                                                className={`p-6 rounded-lg border-2 transition-all flex items-center justify-between gap-4 ${activeId === profile.id ? 'bg-[var(--hero-accent-soft)] border-[var(--hero-accent)]' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}
                                            >
                                                <div className="flex items-center gap-4 min-w-0 flex-grow">
                                                    <div className={`p-3 rounded-xl flex-shrink-0 ${activeId === profile.id ? 'bg-[var(--hero-accent)] text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-500'}`}>
                                                        <UserIcon className="w-5 h-5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-extrabold uppercase tracking-tight text-slate-900 dark:text-white truncate">{profile.name}</p>
                                                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{profile.settings.archetype || 'Expert'}</p>
                                                        <p className="text-[10px] text-slate-400">{computeBrandVoiceCompleteness(profile.settings).score}% kompletny</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    {activeId !== profile.id && (
                                                        <ModernButton onClick={() => onSetActive(profile.id)} variant="ghost" size="sm">Aktywuj</ModernButton>
                                                    )}
                                                    <button onClick={() => setEditingProfile(profile)} aria-label="Edytuj profil" className="p-2 text-slate-400 hover:text-blue-500 transition-colors"><PencilIcon className="w-4 h-4" /></button>
                                                    <button onClick={() => handleDelete(profile.id)} aria-label="Usuń profil" className="p-2 text-slate-400 hover:text-red-500 transition-colors"><TrashIcon className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
        </>
    );
};

// Default export for lazy loading
export default BrandVoiceManagerModal;