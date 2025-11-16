import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { BrandVoiceProfile } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { PencilIcon } from './icons/PencilIcon';
import { IdentificationIcon } from './icons/IdentificationIcon';
import { SparklesIcon } from './icons/SparklesIcon';


interface BrandVoiceManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: BrandVoiceProfile[];
  onSave: (profile: BrandVoiceProfile) => void;
  onDelete: (id: string) => void;
  onSetActive: (id: string | null) => void;
  activeId: string | null;
  onLearnFromFavorites: () => Promise<void>;
  isLearningStyle: boolean;
}

const emptyProfile: Partial<BrandVoiceProfile> = {
    name: '',
    settings: {
        brandName: '',
        description: '',
        keywords: '',
        avoid: '',
        examplesToFollow: [],
        examplesToAvoid: [],
    }
};


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
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4 animate-fade-in">
             <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{profile.id ? t('brandVoiceManager.editTitle') : t('brandVoiceManager.newTitle')}</h3>
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('brandVoiceManager.profileNameLabel')}</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder={t('brandVoiceManager.profileNamePlaceholder')} className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('brandVoiceManager.brandNameLabel')}</label>
                <input type="text" name="brandName" value={formData.settings.brandName} onChange={handleChange} placeholder={t('brandVoiceManager.brandNamePlaceholder')} className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('brandVoiceManager.descriptionLabel')}</label>
                <textarea name="description" value={formData.settings.description} onChange={handleChange} rows={3} placeholder={t('brandVoiceManager.descriptionPlaceholder')} className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('brandVoiceManager.keywordsLabel')}</label>
                <input type="text" name="keywords" value={formData.settings.keywords} onChange={handleChange} placeholder={t('brandVoiceManager.keywordsPlaceholder')} className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('brandVoiceManager.avoidLabel')}</label>
                <input type="text" name="avoid" value={formData.settings.avoid} onChange={handleChange} placeholder={t('brandVoiceManager.avoidPlaceholder')} className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Examples to Follow */}
            <div>
                <label className="block text-sm font-medium text-green-700 dark:text-green-300 mb-2">{t('brandVoiceManager.dosLabel')}</label>
                <div className="space-y-2">
                    {(formData.settings.examplesToFollow || []).map((example, index) => (
                        <div key={index} className="flex items-start gap-2">
                            <textarea
                                value={example}
                                onChange={e => handleExampleChange('examplesToFollow', index, e.target.value)}
                                rows={2}
                                placeholder={t('brandVoiceManager.dosPlaceholder')}
                                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm focus:ring-2 focus:ring-green-500"
                            />
                            <button
                                type="button"
                                onClick={() => removeExample('examplesToFollow', index)}
                                className="p-2 mt-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                                title={t('brandVoiceManager.deleteExample')}
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={() => addExample('examplesToFollow')}
                        className="text-sm font-semibold text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                    >
                        {t('brandVoiceManager.addExample')}
                    </button>
                </div>
            </div>

            {/* Examples to Avoid */}
            <div>
                <label className="block text-sm font-medium text-red-700 dark:text-red-400 mb-2">{t('brandVoiceManager.dontsLabel')}</label>
                <div className="space-y-2">
                    {(formData.settings.examplesToAvoid || []).map((example, index) => (
                        <div key={index} className="flex items-start gap-2">
                            <textarea
                                value={example}
                                onChange={e => handleExampleChange('examplesToAvoid', index, e.target.value)}
                                rows={2}
                                placeholder={t('brandVoiceManager.dontsPlaceholder')}
                                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm focus:ring-2 focus:ring-red-500"
                            />
                            <button
                                type="button"
                                onClick={() => removeExample('examplesToAvoid', index)}
                                className="p-2 mt-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                                title={t('brandVoiceManager.deleteExample')}
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={() => addExample('examplesToAvoid')}
                        className="text-sm font-semibold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                        {t('brandVoiceManager.addExample')}
                    </button>
                </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition">
                    {t('common.cancel')}
                </button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition">
                    {profile.id ? t('common.save') : t('brandVoiceManager.addNewProfile')}
                </button>
            </div>
        </form>
    );
};

export const BrandVoiceManagerModal: React.FC<BrandVoiceManagerModalProps> = ({ isOpen, onClose, profiles, onSave, onDelete, onSetActive, activeId, onLearnFromFavorites, isLearningStyle }) => {
    const [editingProfile, setEditingProfile] = useState<Partial<BrandVoiceProfile> | null>(null);
    const { t } = useTranslation();

    useEffect(() => {
        if (!isOpen) {
            setEditingProfile(null);
        }
    }, [isOpen]);

    const handleSave = (profileData: BrandVoiceProfile) => {
        onSave(profileData);
        setEditingProfile(null);
    };

    const handleDelete = (id: string) => {
        if (window.confirm(t('brandVoiceManager.deleteConfirm'))) {
            onDelete(id);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fade-in"
            style={{ animationDuration: '0.3s' }}
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl w-full max-w-4xl m-4 flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-3">
                        <IdentificationIcon className="w-6 h-6 text-blue-500" />
                        {t('brandVoiceManager.title')}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 text-2xl leading-none">&times;</button>
                </div>
                
                <div className="p-6 overflow-y-auto">
                    {editingProfile ? (
                        <ProfileForm profile={editingProfile} onSave={handleSave} onCancel={() => setEditingProfile(null)} />
                    ) : (
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <button
                                    onClick={() => setEditingProfile(emptyProfile)}
                                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-2.5 px-4 rounded-md hover:bg-blue-700 transition-colors shadow-sm"
                                >
                                    <PlusCircleIcon className="w-5 h-5"/>
                                    {t('brandVoiceManager.addNewProfile')}
                                </button>
                                <button
                                    onClick={onLearnFromFavorites}
                                    disabled={isLearningStyle}
                                    className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white font-bold py-2.5 px-4 rounded-md hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-50"
                                >
                                    {isLearningStyle ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            {t('brandVoiceManager.analyzing')}
                                        </>
                                    ) : (
                                        <>
                                            <SparklesIcon className="w-5 h-5" />
                                            {t('brandVoiceManager.learnFromFavorites')}
                                        </>
                                    )}
                                </button>
                            </div>
                            
                            <div className="space-y-3 pt-4">
                                {profiles.length === 0 ? (
                                    <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">{t('brandVoiceManager.noProfiles')}</p>
                                ) : (
                                    profiles.map(profile => (
                                        <div key={profile.id} className="p-3 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                            <div>
                                                <p className="font-semibold text-gray-800 dark:text-white">{profile.name}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">{profile.settings.description || t('common.noDescription')}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => onSetActive(profile.id)}
                                                    disabled={activeId === profile.id}
                                                    className="px-3 py-1.5 text-xs font-semibold rounded-md transition-colors disabled:cursor-not-allowed disabled:bg-green-100 disabled:text-green-800 dark:disabled:bg-green-900/50 dark:disabled:text-green-300 bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                                                >
                                                    {activeId === profile.id ? t('brandVoiceManager.active') : t('brandVoiceManager.activate')}
                                                </button>
                                                <button onClick={() => setEditingProfile(profile)} className="p-2 text-gray-500 hover:text-blue-500"><PencilIcon className="w-4 h-4" /></button>
                                                <button onClick={() => handleDelete(profile.id)} className="p-2 text-gray-500 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};