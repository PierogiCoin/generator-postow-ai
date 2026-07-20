import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDataStore } from '../stores/dataStore';
import { mergeCalendarPlans } from '../services/calendarCadenceService';
import { navigateToCalendarSlot } from '../services/calendarSlotService';
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
import { ContentInventoryPreview } from './strategist/ContentInventoryPreview';
import {
    analyzeContentInventory,
    buildContentInventory,
} from '../services/contentInventoryService';
import { fetchAuditHistory, type AuditHistoryEntry } from '../services/strategicAuditService';

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

const ReportDisplay: React.FC<{
    report: StrategicAuditReport;
    selectedBrandId?: string;
    onNewAudit: () => void;
}> = ({ report, selectedBrandId, onNewAudit }) => {
    const { t, i18n } = useTranslation();
    const dateLocale = i18n.language?.startsWith('pl') ? 'pl-PL' : 'en-US';
    const { setIntelligentCalendarPlan, setActiveBrandVoiceId, intelligentCalendarPlan } = useDataStore();
    const [planImported, setPlanImported] = useState(false);
    const navigate = useNavigate();

    const handleGenerateClick = async (item: IntelligentCalendarPlanItem) => {
        if (selectedBrandId) {
            setActiveBrandVoiceId(selectedBrandId);
        }

        const merged = mergeCalendarPlans(intelligentCalendarPlan, [item]);
        await setIntelligentCalendarPlan(merged);
        navigateToCalendarSlot(item, navigate, true);
    };

    const handleImport = useCallback(async () => {
        const merged = mergeCalendarPlans(intelligentCalendarPlan, report.actionablePlan);
        await setIntelligentCalendarPlan(merged);
        setPlanImported(true);
        setTimeout(() => navigate("/calendar"), 1500);
    }, [report.actionablePlan, navigate, intelligentCalendarPlan, setIntelligentCalendarPlan]);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('strategist.report.title')}</h1>
                <button
                    type="button"
                    onClick={onNewAudit}
                    className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                    {t('strategist.report.newAudit', 'Nowy audyt')}
                </button>
            </div>
            {/* Summary */}
            <div className="p-6 bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 rounded-r-lg">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('strategist.report.summary')}</h3>
                <p className="text-slate-700 dark:text-slate-300">{report.summary}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Pillars */}
                {report.contentPillars?.length > 0 && (
                <div className="p-6 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{t('strategist.report.pillars')}</h3>
                    <div className="space-y-4">
                        {report.contentPillars.map(p => (
                            <details key={p.pillar} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                                <summary className="font-semibold cursor-pointer">{p.pillar}</summary>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{p.description}</p>
                                <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                                    {(p.postIdeas ?? []).map((idea, i) => <li key={`${p.pillar}-${i}`}>{idea}</li>)}
                                </ul>
                            </details>
                        ))}
                    </div>
                </div>
                )}

                {/* Persona */}
                {report.refinedPersona && (
                <div className="p-6 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{t('strategist.report.persona')}</h3>
                    <h4 className="font-bold text-lg text-blue-700 dark:text-blue-300">{report.refinedPersona.name}, {report.refinedPersona.age}</h4>
                    <p className="text-sm font-medium">{report.refinedPersona.jobTitle} @ {report.refinedPersona.location}</p>
                    <p className="text-sm mt-2">{report.refinedPersona.demographics}</p>
                    {report.refinedPersona.goals?.length > 0 && (
                        <div className="mt-4">
                            <p className="text-xs font-bold uppercase text-slate-500 mb-1">{t('strategist.report.personaGoals', 'Cele')}</p>
                            <ul className="list-disc list-inside text-sm space-y-1">{report.refinedPersona.goals.map((g, i) => <li key={`goal-${i}`}>{g}</li>)}</ul>
                        </div>
                    )}
                    {report.refinedPersona.painPoints?.length > 0 && (
                        <div className="mt-3">
                            <p className="text-xs font-bold uppercase text-slate-500 mb-1">{t('strategist.report.personaPain', 'Bóle')}</p>
                            <ul className="list-disc list-inside text-sm space-y-1">{report.refinedPersona.painPoints.map((p, i) => <li key={`pain-${i}`}>{p}</li>)}</ul>
                        </div>
                    )}
                    {report.refinedPersona.communicationTips && (
                        <p className="text-sm mt-3 text-slate-600 dark:text-slate-400 italic">{report.refinedPersona.communicationTips}</p>
                    )}
                </div>
                )}
            </div>

            {/* Competitive snapshot */}
            {report.competitiveSnapshot?.length > 0 && (
                <div className="p-6 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{t('strategist.report.competitors')}</h3>
                    <div className="space-y-4">
                        {report.competitiveSnapshot.map((c, i) => (
                            <div key={`comp-${i}`} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                                <h4 className="font-semibold text-slate-900 dark:text-white">{c.competitor}</h4>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{c.analysis}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Content adaptation */}
            {report.contentAdaptation && (
                <div className="p-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                        {t('strategist.report.adaptation', 'Dopasowanie do Twoich treści')}
                    </h3>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">{report.contentAdaptation.notes}</p>
                    <p className="text-xs text-slate-500 mb-3">
                        {t('strategist.report.reviewedCount', { count: report.contentAdaptation.reviewedCount, defaultValue: `Przeanalizowano ${report.contentAdaptation.reviewedCount} istniejących pozycji` })}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {(report.contentAdaptation.buildsOn?.length ?? 0) > 0 && (
                            <div>
                                <h4 className="font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                                    {t('strategist.report.buildsOn', 'Rozwija')}
                                </h4>
                                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                                    {report.contentAdaptation.buildsOn.map((b, i) => <li key={`build-${i}`}>{b}</li>)}
                                </ul>
                            </div>
                        )}
                        {(report.contentAdaptation.gapsFilled?.length ?? 0) > 0 && (
                            <div>
                                <h4 className="font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                                    {t('strategist.report.gapsFilled', 'Uzupełnia luki')}
                                </h4>
                                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                                    {report.contentAdaptation.gapsFilled.map((g, i) => <li key={`gf-${i}`}>{g}</li>)}
                                </ul>
                            </div>
                        )}
                        {(report.contentAdaptation.avoidedRepetition?.length ?? 0) > 0 && (
                            <div>
                                <h4 className="font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                                    {t('strategist.report.avoided', 'Unika powtórzeń')}
                                </h4>
                                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                                    {report.contentAdaptation.avoidedRepetition.map((a, i) => <li key={`av-${i}`}>{a}</li>)}
                                </ul>
                            </div>
                        )}
                        {(report.contentAdaptation.complementsScheduled?.length ?? 0) > 0 && (
                            <div>
                                <h4 className="font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                                    {t('strategist.report.complements', 'Uzupełnia kalendarz')}
                                </h4>
                                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                                    {report.contentAdaptation.complementsScheduled.map((c, i) => <li key={`cs-${i}`}>{c}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                    {report.contentInventory && (
                        <div className="mt-4">
                            <ContentInventoryPreview review={report.contentInventory} compact />
                        </div>
                    )}
                </div>
            )}

            {/* Intelligence insights */}
            {report.intelligenceInsights && (
                <div className="p-6 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{t('strategist.report.intelligence', 'Inteligencja na żywo')}</h3>
                    {report.intelligenceInsights.industryPulse && (
                        <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">{report.intelligenceInsights.industryPulse}</p>
                    )}
                    {report.intelligenceInsights.competitorRecommendation && (
                        <p className="text-sm font-medium text-violet-700 dark:text-violet-300 mb-4">
                            {t('strategist.report.scheduleRec', 'Harmonogram')}: {report.intelligenceInsights.competitorRecommendation}
                        </p>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                        {(report.intelligenceInsights.trendingTopics?.length ?? 0) > 0 && (
                            <div>
                                <h4 className="font-semibold mb-2">{t('strategist.report.trends', 'Trendy')}</h4>
                                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                                    {report.intelligenceInsights.trendingTopics.map((topic, i) => <li key={`trend-${i}`}>{topic}</li>)}
                                </ul>
                            </div>
                        )}
                        {(report.intelligenceInsights.contentGaps?.length ?? 0) > 0 && (
                            <div>
                                <h4 className="font-semibold mb-2">{t('strategist.report.contentGaps', 'Luki treści')}</h4>
                                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                                    {report.intelligenceInsights.contentGaps.map((g, i) => <li key={`gap-${i}`}>{g}</li>)}
                                </ul>
                            </div>
                        )}
                        {(report.intelligenceInsights.optimalPostingSlots?.length ?? 0) > 0 && (
                            <div>
                                <h4 className="font-semibold mb-2">{t('strategist.report.optimalTimes', 'Optymalne godziny')}</h4>
                                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                                    {report.intelligenceInsights.optimalPostingSlots.map((s, i) => <li key={`slot-${i}`}>{s}</li>)}
                                </ul>
                            </div>
                        )}
                        {(report.intelligenceInsights.newsAngles?.length ?? 0) > 0 && (
                            <div>
                                <h4 className="font-semibold mb-2">{t('strategist.report.newsAngles', 'Kąty z newsów')}</h4>
                                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                                    {report.intelligenceInsights.newsAngles.map((n, i) => <li key={`news-${i}`}>{n}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* SWOT */}
            {report.swot && (
            <div className="p-6 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{t('strategist.report.swot')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="font-semibold text-green-600 mb-2">{t('strategist.report.strengths')}</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">{(report.swot.strengths ?? []).map((s, i) => <li key={`strength-${i}`}>{s}</li>)}</ul>
                    </div>
                    <div>
                        <h4 className="font-semibold text-red-600 mb-2">{t('strategist.report.weaknesses')}</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">{(report.swot.weaknesses ?? []).map((s, i) => <li key={`weakness-${i}`}>{s}</li>)}</ul>
                    </div>
                    <div>
                        <h4 className="font-semibold text-blue-600 mb-2">{t('strategist.report.opportunities')}</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">{(report.swot.opportunities ?? []).map((s, i) => <li key={`opportunity-${i}`}>{s}</li>)}</ul>
                    </div>
                    <div>
                        <h4 className="font-semibold text-yellow-600 mb-2">{t('strategist.report.threats')}</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">{(report.swot.threats ?? []).map((s, i) => <li key={`threat-${i}`}>{s}</li>)}</ul>
                    </div>
                </div>
            </div>
            )}

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
                                    {new Date(item.date + 'T12:00:00Z').toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long' })}
                                    {item.time && <span className="ml-2 text-slate-400">@ {item.time}</span>}
                                </p>
                                <p className="font-semibold text-sm mt-1">{item.topic}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{item.strategy}</p>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300 font-medium uppercase">{item.platform}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 rounded text-blue-600 dark:text-blue-300 font-medium uppercase">{item.format}</span>
                                    {item.slotType && (
                                        <span className="text-[10px] px-1.5 py-0.5 bg-violet-100 dark:bg-violet-900/40 rounded text-violet-600 dark:text-violet-300 font-medium uppercase">{item.slotType}</span>
                                    )}
                                    {item.contentIntent && (
                                        <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 rounded text-emerald-700 dark:text-emerald-300 font-medium">{item.contentIntent}</span>
                                    )}
                                    {item.suggestedTone && (
                                        <span className="text-[10px] italic text-slate-500 font-medium">{t('strategist.report.tone', 'Ton')}: {item.suggestedTone}</span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => handleGenerateClick(item)}
                                aria-label={t('strategist.report.generatePost')}
                                className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-sm shrink-0"
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
    const { t, i18n } = useTranslation();
    const dateLocale = i18n.language?.startsWith('pl') ? 'pl-PL' : 'en-US';
    const { userPlan, user } = useAuth();
    const { addToast } = useNotifications();
    const handlers = useAppHandlers(addToast, () => { });
    const { strategicAuditReport, isAuditing, auditError, clearStrategicAuditReport, loadStrategicAuditReport, history, favorites, scheduledPosts, intelligentCalendarPlan } = useDataStore();
    const [showForm, setShowForm] = useState(false);
    const [auditHistory, setAuditHistory] = useState<AuditHistoryEntry[]>([]);

    const formVisible = !strategicAuditReport || showForm;

    const refreshAuditHistory = useCallback(() => {
        if (!user) return;
        fetchAuditHistory(user.id, 8).then(setAuditHistory).catch(() => setAuditHistory([]));
    }, [user]);

    useEffect(() => {
        refreshAuditHistory();
    }, [refreshAuditHistory]);

    // Po wygenerowaniu nowego audytu odśwież listę (zapis do Supabase jest best-effort/async).
    useEffect(() => {
        if (!strategicAuditReport) return;
        const timer = setTimeout(refreshAuditHistory, 1500);
        return () => clearTimeout(timer);
    }, [strategicAuditReport, refreshAuditHistory]);

    const [goal, setGoal] = useState('');
    const [audience, setAudience] = useState('');
    const [competitors, setCompetitors] = useState('');
    const [selectedBrandId, setSelectedBrandId] = useState<string>('');
    const [frequency, setFrequency] = useState('3_times_week');
    const [formats, setFormats] = useState<GenerationType[]>([GenerationType.PostWithImage, GenerationType.Video]);
    const [platforms, setPlatforms] = useState<Platform[]>([Platform.Facebook]);
    const [lastSubmittedData, setLastSubmittedData] = useState<{ goal: string; audience: string; competitors: string[]; brandId?: string, preferences: { frequency: string; formats: GenerationType[] }, platforms: Platform[] } | null>(null);

    const inventoryPreview = useMemo(() => {
        const items = buildContentInventory({
            history,
            favorites,
            scheduledPosts,
            calendarPlan: intelligentCalendarPlan,
            targetPlatforms: platforms,
        });
        return analyzeContentInventory(items, platforms);
    }, [history, favorites, scheduledPosts, intelligentCalendarPlan, platforms]);

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
        setShowForm(false);
        handlers.handleRunStrategicAudit(goal, audience, competitorList, selectedBrandId, currentPreferences, platforms); // UPDATED
    }

    const handleNewAudit = () => {
        clearStrategicAuditReport();
        setShowForm(true);
    };

    const handleLoadPastAudit = (entry: AuditHistoryEntry) => {
        loadStrategicAuditReport(entry.report);
        setShowForm(false);
    };

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

    if (strategicAuditReport && !showForm) {
        return (
            <ReportDisplay
                report={strategicAuditReport}
                selectedBrandId={lastSubmittedData?.brandId || selectedBrandId}
                onNewAudit={handleNewAudit}
            />
        );
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
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('strategist.form.platformsLabel', 'Platformy docelowe (wiele)')}</label>
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
                                    aria-label={`${p}`}
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
                    <button type="submit" disabled={!goal || !audience || platforms.length === 0 || formats.length === 0} aria-label={t('strategist.form.submit')} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition disabled:opacity-50">
                        <SparklesIcon className="w-5 h-5" />
                        {t('strategist.form.submit')}
                    </button>
                </div>

                <ContentInventoryPreview review={inventoryPreview} />
            </form>

            {auditHistory.length > 0 && (
                <div className="p-6 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                        {t('strategist.history.title', 'Poprzednie audyty')}
                    </h3>
                    <div className="space-y-2">
                        {auditHistory.map((entry) => (
                            <button
                                key={entry.id}
                                type="button"
                                onClick={() => handleLoadPastAudit(entry)}
                                className="w-full text-left p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition group"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                            {new Date(entry.timestamp).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2 mt-1">
                                            {entry.report.summary}
                                        </p>
                                    </div>
                                    <span className="shrink-0 text-xs font-semibold text-slate-400 group-hover:text-blue-500 transition">
                                        {t('strategist.history.open', 'Otwórz')} →
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
