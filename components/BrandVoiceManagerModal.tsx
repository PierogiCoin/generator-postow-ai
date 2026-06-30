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


interface BrandVoiceManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    profiles: BrandVoiceProfile[];
    onSave: (profile: BrandVoiceProfile) => void;
    onDelete: (id: string) => void;
    onSetActive: (id: string | null) => void;
    activeId: string | null;
    onLearnFromFavorites: () => Promise<void>;
    onLearnFromHistory?: () => Promise<void>;
    isLearningStyle: boolean;
}

const emptyProfile: Partial<BrandVoiceProfile> = {
    name: '',
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
    }
};

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
                examplesToFollow: initialSettings.examplesToFollow || [],
                examplesToAvoid: initialSettings.examplesToAvoid || [],
            },
            teamId: profile?.teamId !== undefined ? profile.teamId : null
        });
    }, [profile]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                    {profile.id ? 'Edytuj Tożsamość' : 'Nowa Tożsamość Marki'}
                </h3>
                <div className="flex gap-2">
                    <ModernButton onClick={onCancel} variant="ghost" size="sm">Anuluj</ModernButton>
                    <ModernButton onClick={() => onSave(formData)} variant="primary" size="sm">Zapisz Profil</ModernButton>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="space-y-4">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-500">Podstawowe Dane</label>
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
                                className="w-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-sm focus:border-blue-500 transition-all outline-none"
                                placeholder="Czym zajmuje się Twoja marka? Jaka jest jej misja?"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-500">Archetyp Osobowości</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {ARCHETYPES.map((arch) => (
                                <button
                                    key={arch.id}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, settings: { ...prev.settings, archetype: arch.id } }))}
                                    className={`p-4 rounded-2xl border-2 transition-all text-left flex flex-col gap-2 ${formData.settings.archetype === arch.id ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-blue-400 group'}`}
                                >
                                    <arch.icon className={`w-6 h-6 ${formData.settings.archetype === arch.id ? 'text-white' : 'text-blue-500 group-hover:scale-110 transition-transform'}`} />
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-tight">{arch.label}</p>
                                        <p className={`text-[10px] leading-tight ${formData.settings.archetype === arch.id ? 'text-blue-100' : 'text-slate-500'}`}>{arch.desc}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="p-8 bg-slate-900 dark:bg-slate-950 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-700">
                            <RocketIcon className="w-24 h-24 text-blue-500" />
                        </div>
                        <div className="relative z-10 space-y-6">
                            <h4 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                                <SparklesIcon className="w-6 h-6 text-blue-400" />
                                Wizualne Aktywa
                            </h4>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-white/50 uppercase tracking-widest block mb-2">Logo Marki</label>
                                <div className="flex items-center gap-4 p-4 bg-white/5 rounded-3xl border border-white/10 group-hover:border-blue-500/50 transition-all">
                                    <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center overflow-hidden border border-white/10">
                                        {formData.settings.logoUrl ? (
                                            <img src={formData.settings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
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
                                            className={`inline-flex items-center px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer transition-all ${isUploading === 'logos' ? 'bg-slate-700 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-500'}`}
                                        >
                                            {isUploading === 'logos' ? 'Wgrywanie...' : 'Wgraj Logo'}
                                        </label>
                                        <p className="text-[10px] text-slate-500">PNG, JPG lub SVG (max 2MB)</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 bg-white/5 rounded-3xl border border-white/10 space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-black text-white/30 uppercase tracking-widest">Maskotka Marki</label>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, settings: { ...prev.settings, includeMascotInGeneration: !prev.settings.includeMascotInGeneration } }))}
                                        className={`w-12 h-6 rounded-full transition-all relative ${formData.settings.includeMascotInGeneration ? 'bg-blue-500' : 'bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.settings.includeMascotInGeneration ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="w-20 h-20 rounded-2xl bg-slate-800 flex items-center justify-center overflow-hidden border border-white/10">
                                        {formData.settings.mascotUrl ? (
                                            <img src={formData.settings.mascotUrl} alt="Mascot" className="w-full h-full object-contain" />
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
                                            className={`inline-flex items-center px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer transition-all ${isUploading === 'mascots' ? 'bg-slate-700 text-slate-400' : 'bg-purple-600 text-white hover:bg-purple-500'}`}
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
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-white outline-none focus:border-blue-500 transition-all"
                                    placeholder="Opisz maskotkę dla AI gen-grafiki..."
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500">Przykłady (Long-term Learn)</label>
                    <div className="grid grid-cols-1 gap-4">
                        <div className="p-6 bg-green-50/50 dark:bg-green-900/10 rounded-3xl border border-green-100 dark:border-green-800/30">
                            <p className="text-xs font-black text-green-700 dark:text-green-400 uppercase tracking-widest mb-4">Używaj takich sformułowań:</p>
                            <div className="space-y-3">
                                {formData.settings.examplesToFollow?.map((ex, i) => (
                                    <div key={`example-${i}`} className="flex gap-2">
                                        <input value={ex} onChange={e => handleExampleChange('examplesToFollow', i, e.target.value)} className="flex-grow bg-white dark:bg-slate-900 border-none rounded-xl p-2 text-xs" />
                                        <button onClick={() => removeExample('examplesToFollow', i)} aria-label="Remove example" className="text-red-400 hover:text-red-600">&times;</button>
                                    </div>
                                ))}
                                <button onClick={() => addExample('examplesToFollow')} aria-label="Add example" className="text-[10px] font-black text-green-600 uppercase">+ Dodaj przykład</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const BrandVoiceManagerModal: React.FC<BrandVoiceManagerModalProps> = ({ isOpen, onClose, profiles, onSave, onDelete, onSetActive, activeId, onLearnFromFavorites, onLearnFromHistory, isLearningStyle }) => {
    const [editingProfile, setEditingProfile] = useState<Partial<BrandVoiceProfile> | null>(null);
    const { t } = useTranslation();
    const { confirm, confirmDialogProps } = useConfirm();

    useEffect(() => {
        if (!isOpen) {
            setEditingProfile(null);
        }
    }, [isOpen]);

    const handleSave = (profileData: BrandVoiceProfile) => {
        onSave(profileData);
        setEditingProfile(null);
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
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl flex items-center justify-center z-[100] transition-all p-4"
            onClick={onClose}
        >
            <div
                className="bg-white/90 dark:bg-slate-900/90 border border-white/20 rounded-[3rem] shadow-2xl w-full max-w-6xl flex flex-col max-h-[90vh] overflow-hidden animate-scale-in"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-8 pb-4 flex justify-between items-center bg-gradient-to-r from-blue-600/5 to-purple-600/5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/30">
                            <IdentificationIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Tożsamość Marki</h2>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Brand Voice & Assets Manager</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-red-500 hover:text-white transition-all transform hover:rotate-90"
                    >
                        &times;
                    </button>
                </div>

                <div className="p-8 overflow-y-auto custom-scrollbar flex-grow">
                    {editingProfile ? (
                        <ProfileForm profile={editingProfile} onSave={handleSave} onCancel={() => setEditingProfile(null)} />
                    ) : (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <button
                                    onClick={() => setEditingProfile(emptyProfile)}
                                    className="p-8 bg-blue-600 rounded-[2rem] text-white flex flex-col items-center justify-center gap-4 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-blue-500/20 group"
                                >
                                    <div className="p-3 bg-white/20 rounded-2xl group-hover:rotate-12 transition-transform">
                                        <PlusCircleIcon className="w-8 h-8" />
                                    </div>
                                    <span className="font-black uppercase tracking-widest text-sm text-white">{t('brandVoiceManager.addNewProfile')}</span>
                                </button>

                                <button
                                    onClick={onLearnFromHistory}
                                    disabled={isLearningStyle}
                                    className="p-8 bg-white dark:bg-slate-800 rounded-[2rem] border-2 border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center gap-4 hover:border-blue-500 transition-all group"
                                >
                                    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-2xl text-blue-600 group-hover:scale-110 transition-transform">
                                        <SparklesIcon className="w-8 h-8" />
                                    </div>
                                    <span className="font-black uppercase tracking-widest text-sm text-slate-800 dark:text-white">Ucz się z Historii</span>
                                </button>

                                <button
                                    onClick={onLearnFromFavorites}
                                    disabled={isLearningStyle}
                                    className="p-8 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-[2rem] text-white flex flex-col items-center justify-center gap-4 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-purple-500/20 group"
                                >
                                    <div className="p-3 bg-white/20 rounded-2xl group-hover:animate-pulse">
                                        <HeartIcon className="w-8 h-8" />
                                    </div>
                                    <span className="font-black uppercase tracking-widest text-sm text-white">Ucz się z Ulubionych</span>
                                </button>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Aktywne Profile Głosowe</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {profiles.length === 0 ? (
                                        <div className="col-span-full py-12 flex flex-col items-center gap-4 bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                                            <ArchiveBoxIcon className="w-12 h-12 text-slate-300" />
                                            <p className="text-slate-400 font-medium">Brak zdefiniowanych profili marki.</p>
                                        </div>
                                    ) : (
                                        profiles.map(profile => (
                                            <div
                                                key={profile.id}
                                                className={`p-6 rounded-[2rem] border-2 transition-all flex items-center justify-between ${activeId === profile.id ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-500 shadow-lg shadow-blue-500/10' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-3 rounded-xl ${activeId === profile.id ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                                        <UserIcon className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-black uppercase tracking-tight text-slate-900 dark:text-white">{profile.name}</p>
                                                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{profile.settings.archetype || 'Expert'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {activeId !== profile.id && (
                                                        <ModernButton onClick={() => onSetActive(profile.id)} variant="ghost" size="sm">Aktywuj</ModernButton>
                                                    )}
                                                    <button onClick={() => setEditingProfile(profile)} aria-label="Edit profile" className="p-2 text-slate-400 hover:text-blue-500 transition-colors"><PencilIcon className="w-4 h-4" /></button>
                                                    <button onClick={() => handleDelete(profile.id)} aria-label="Delete profile" className="p-2 text-slate-400 hover:text-red-500 transition-colors"><TrashIcon className="w-4 h-4" /></button>
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