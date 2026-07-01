import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDataStore } from '../stores/dataStore';
import { useUIStore } from '../stores/uiStore';
import { useAppHandlers } from '../hooks/useAppHandlers';
import { useNotifications } from '../hooks/useNotifications';
import { UserPlan, Platform, GenerationType } from '../types'; // Import Platform and GenerationType
import { platformConfig } from '../config/platformConfig'; // Import platformConfig
import type { StrategicAuditReport, IntelligentCalendarPlanItem, AudiencePersona } from '../types';

// Icons
import { BrainCircuitIcon } from './icons/BrainCircuitIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { CheckIcon } from './icons/CheckIcon';
import { PostIcon } from './icons/PostIcon';
import { LinkIcon } from './icons/LinkIcon';
import { ErrorDisplay } from './ErrorDisplay';

const AUDIT_STEPS_KEYS = [
    'strategist.loading.steps.0',
    'strategist.loading.steps.1',
    'strategist.loading.steps.2',
    'strategist.loading.steps.3',
    'strategist.loading.steps.4',
    'strategist.loading.steps.5',
];


const LockedState: React.FC = () => {
    const { t } = useTranslation();
    const { setIsPricingModalOpen } = useUIStore();
    return (
        <div className="text-center py-20 px-6 bg-white dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
            <BrainCircuitIcon className="w-16 h-16 mx-auto text-yellow-400 mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{t('strategist.locked.title')}</h2>
            <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
                {t('strategist.locked.description')}
            </p>
            <button
                onClick={() => setIsPricingModalOpen(true)}
                className="mt-8 px-6 py-3 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition-all shadow-lg flex items-center gap-2 mx-auto"
            >
                <SparklesIcon className="w-5 h-5" />
                {t('strategist.locked.upgradeButton')}
            </button>
        </div>
    );
};

const LoadingState: React.FC = () => {
    const { t } = useTranslation();
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentStep(prev => (prev + 1) % AUDIT_STEPS_KEYS.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="text-center py-20 px-6 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center">
            <svg className="animate-spin h-12 w-12 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{t('strategist.loading.title')}</h2>
            <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-xl">{t('strategist.loading.subtitle')}</p>
            <p className="mt-4 font-semibold text-blue-600 dark:text-blue-400">{t(AUDIT_STEPS_KEYS[currentStep])}</p>
        </div>
    );
};

const ReportDisplay: React.FC<{ report: StrategicAuditReport; selectedBrandId?: string }> = ({ report, selectedBrandId }) => {
    const { t } = useTranslation();
    const { setIntelligentCalendarPlan, setActiveBrandVoiceId } = useDataStore();
    const [planImported, setPlanImported] = useState(false);
    const navigate = useNavigate();

    const handleGenerateClick = (item: IntelligentCalendarPlanItem) => {
        // If we have a brand ID from the strategy form, activate it before navigating
        if (selectedBrandId) {
            setActiveBrandVoiceId(selectedBrandId);
        }

        navigate("/generator", {
            state: {
                prefillData: {
                    topic: item.topic || "",
                    platform: item.platform,
                    generationType: item.format,
                    tone: item.suggestedTone,
                    learnedInsights: [{
                        id: `audit-${Date.now()}`,
                        type: 'suggestion',
                        category: 'performance_tip',
                        text: `SUGGESTION FROM STRATEGY: ${item.strategy}`
                    }],
                    // Pass it through state too for extra safety
                    activeBrandVoiceId: selectedBrandId
                }
            }
        });
    };

    const handleImport = useCallback(() => {
        setIntelligentCalendarPlan(report.actionablePlan);
        setPlanImported(true);
        setTimeout(() => navigate("/calendar"), 1500);
    }, [report.actionablePlan, navigate]);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="text-center">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('strategist.report.title')}</h1>
            </div>
            {/* Summary */}
            <div className="p-6 bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 rounded-r-lg">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('strategist.report.summary')}</h3>
                <p className="text-slate-700 dark:text-slate-300">{report.summary}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Pillars */}
                <div className="p-6 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{t('strategist.report.pillars')}</h3>
                    <div className="space-y-4">
                        {report.contentPillars.map(p => (
                            <details key={p.pillar} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                                <summary className="font-semibold cursor-pointer">{p.pillar}</summary>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{p.description}</p>
                                <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                                    {p.postIdeas.map((idea, i) => <li key={`${p.pillar}-${i}`}>{idea}</li>)}
                                </ul>
                            </details>
                        ))}
                    </div>
                </div>

                {/* Persona */}
                <div className="p-6 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{t('strategist.report.persona')}</h3>
                    <h4 className="font-bold text-lg text-blue-700 dark:text-blue-300">{report.refinedPersona.name}, {report.refinedPersona.age}</h4>
                    <p className="text-sm font-medium">{report.refinedPersona.jobTitle} @ {report.refinedPersona.location}</p>
                    <p className="text-sm mt-2">{report.refinedPersona.demographics}</p>
                </div>
            </div>

            {/* SWOT */}
            <div className="p-6 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{t('strategist.report.swot')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="font-semibold text-green-600 mb-2">{t('strategist.report.strengths')}</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">{report.swot.strengths.map((s, i) => <li key={`strength-${i}`}>{s}</li>)}</ul>
                    </div>
                    <div>
                        <h4 className="font-semibold text-red-600 mb-2">{t('strategist.report.weaknesses')}</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">{report.swot.weaknesses.map((s, i) => <li key={`weakness-${i}`}>{s}</li>)}</ul>
                    </div>
                    <div>
                        <h4 className="font-semibold text-blue-600 mb-2">{t('strategist.report.opportunities')}</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">{report.swot.opportunities.map((s, i) => <li key={`opportunity-${i}`}>{s}</li>)}</ul>
                    </div>
                    <div>
                        <h4 className="font-semibold text-yellow-600 mb-2">{t('strategist.report.threats')}</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">{report.swot.threats.map((s, i) => <li key={`threat-${i}`}>{s}</li>)}</ul>
                    </div>
                </div>
            </div>

            {/* Plan */}
            <div className="p-6 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t('strategist.report.plan')}</h3>
                    <button onClick={handleImport} disabled={planImported} aria-label={planImported ? "Plan imported" : "Import plan"} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition disabled:bg-green-600">
                        {planImported ? <><CheckIcon className="w-5 h-5" /> {t('strategist.report.planImported')}</> : <>{t('strategist.report.importPlan')}</>}
                    </button>
                </div>
                <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                    {report.actionablePlan.map(item => (
                        <div key={item.id} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg flex justify-between items-center group">
                            <div className="flex-1">
                                <p className="text-xs font-bold text-blue-600">
                                    {new Date(item.date + 'T12:00:00Z').toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
                                    {item.time && <span className="ml-2 text-slate-400">@ {item.time}</span>}
                                </p>
                                <p className="font-semibold text-sm mt-1">{item.topic}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300 font-medium uppercase">{item.platform}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 rounded text-blue-600 dark:text-blue-300 font-medium uppercase">{item.format}</span>
                                    {item.suggestedTone && (
                                        <span className="text-[10px] italic text-slate-500 font-medium">Ton: {item.suggestedTone}</span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => handleGenerateClick(item)}
                                aria-label={t('strategist.report.generatePost')}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-sm"
                                title={t('strategist.report.generatePost')}
                            >
                                <PostIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export const AIStrategistView: React.FC = () => {
    const { t } = useTranslation();
    const { userPlan } = useAuth();
    const { addToast } = useNotifications();
    const handlers = useAppHandlers(addToast, () => { });
    const { strategicAuditReport, isAuditing, auditError } = useDataStore();

    const [goal, setGoal] = useState('');
    const [audience, setAudience] = useState('');
    const [competitors, setCompetitors] = useState('');
    const [selectedBrandId, setSelectedBrandId] = useState<string>('');
    const [frequency, setFrequency] = useState('3_times_week');
    const [formats, setFormats] = useState<GenerationType[]>([GenerationType.PostWithImage, GenerationType.Video]);
    const [platforms, setPlatforms] = useState<Platform[]>([Platform.Facebook]); // NEW
    const [lastSubmittedData, setLastSubmittedData] = useState<{ goal: string; audience: string; competitors: string[]; brandId?: string, preferences: { frequency: string; formats: GenerationType[] }, platforms: Platform[] } | null>(null); // UPDATED

    const { brandVoiceProfiles } = useDataStore();

    const isStrategistEnabled = [UserPlan.Pro, UserPlan.Agency, UserPlan.Business, UserPlan.Enterprise].includes(userPlan);

    if (!isStrategistEnabled) {
        return <LockedState />;
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const competitorList = competitors.split("\n").filter(c => c.trim() !== "");
        const currentPreferences = { frequency, formats };
        setLastSubmittedData({ goal, audience, competitors: competitorList, brandId: selectedBrandId, preferences: currentPreferences, platforms: platforms }); // UPDATED
        handlers.handleRunStrategicAudit(goal, audience, competitorList, selectedBrandId, currentPreferences, platforms); // UPDATED
    }

    const handleRetry = () => {
        if (lastSubmittedData) {
            handlers.handleRunStrategicAudit(
                lastSubmittedData.goal,
                lastSubmittedData.audience,
                lastSubmittedData.competitors,
                lastSubmittedData.brandId,
                lastSubmittedData.preferences,
                lastSubmittedData.platforms // Pass platforms on retry
            );
        }
    };

    if (auditError) {
        return (
            <div className="max-w-4xl mx-auto">
                <ErrorDisplay error={auditError} onRetry={handleRetry} />
            </div>
        );
    }

    if (isAuditing) {
        return <LoadingState />;
    }

    if (strategicAuditReport) {
        return <ReportDisplay report={strategicAuditReport} selectedBrandId={lastSubmittedData?.brandId || selectedBrandId} />;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <div className="text-center">
                <BrainCircuitIcon className="w-16 h-16 mx-auto text-blue-500 mb-4" />
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('strategist.title')}</h1>
                <p className="mt-2 text-slate-500 dark:text-slate-400">{t('strategist.subtitle')}</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('strategist.form.brandProfileLabel')}</label>
                        <select
                            value={selectedBrandId}
                            onChange={e => setSelectedBrandId(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">{t('strategist.form.brandProfilePlaceholder')}</option>
                            {brandVoiceProfiles.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('strategist.form.frequencyLabel')}</label>
                        <select
                            value={frequency}
                            onChange={e => setFrequency(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="daily">{t('strategist.form.freqDaily')}</option>
                            <option value="3_times_week">{t('strategist.form.freq3perWeek')}</option>
                            <option value="2_times_week">{t('strategist.form.freq2perWeek')}</option>
                            <option value="weekly">{t('strategist.form.freqWeekly')}</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Platformy docelowe (wiele)</label>
                    <div className="flex flex-wrap gap-3">
                        {Object.values(Platform).map(p => {
                            const config = platformConfig[p];
                            const Icon = config.icon;
                            const isSelected = platforms.includes(p);
                            return (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setPlatforms(prev => prev.includes(p) ? prev.filter(pl => pl !== p) : [...prev, p])}
                                    aria-label={isSelected ? `Deselect ${p}` : `Select ${p}`}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${isSelected ? config.color.replace("bg-", "bg-") + " text-white shadow-sm" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"}`}
                                >
                                    <Icon className="w-4 h-4" /> {p}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('strategist.form.formatsLabel')}</label>
                    <div className="flex flex-wrap gap-4">
                        {[
                            { id: GenerationType.PostWithImage, label: t('strategist.form.formatPost') },
                            { id: GenerationType.Video, label: t('strategist.form.formatVideo') },
                            { id: GenerationType.Idea, label: t('strategist.form.formatIdea') }
                        ].map(f => (
                            <label key={f.id} className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formats.includes(f.id)}
                                    onChange={e => {
                                        if (e.target.checked) setFormats([...formats, f.id]);
                                        else setFormats(formats.filter(item => item !== f.id));
                                    }}
                                    className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-slate-600 dark:text-slate-400">{f.label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div>
                    <label htmlFor="goal" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('strategist.form.goalLabel')}</label>
                    <input type="text" id="goal" value={goal} onChange={e => setGoal(e.target.value)} placeholder={t('strategist.form.goalPlaceholder')} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div>
                    <label htmlFor="audience" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('strategist.form.audienceLabel')}</label>
                    <input type="text" id="audience" value={audience} onChange={e => setAudience(e.target.value)} placeholder={t('strategist.form.audiencePlaceholder')} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div>
                    <label htmlFor="competitors" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('strategist.form.competitorsLabel')}</label>
                    <textarea id="competitors" value={competitors} onChange={e => setCompetitors(e.target.value)} rows={3} placeholder={t('strategist.form.competitorsPlaceholder')} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex justify-end">
                    <button type="submit" disabled={!goal || !audience || platforms.length === 0 || formats.length === 0} aria-label="Generate strategy" className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition disabled:opacity-50">
                        <SparklesIcon className="w-5 h-5" />
                        {t('strategist.form.submit')}
                    </button>
                </div>
            </form>
        </div>
    );
};
