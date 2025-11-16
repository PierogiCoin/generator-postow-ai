import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDataStore } from '../stores/dataStore';
import { useUIStore } from '../stores/uiStore';
import { useAppHandlers } from '../hooks/useAppHandlers';
import { useNotifications } from '../hooks/useNotifications';
import { UserPlan } from '../types';
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
                <SparklesIcon className="w-5 h-5"/>
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

const ReportDisplay: React.FC<{ report: StrategicAuditReport }> = ({ report }) => {
    const { t } = useTranslation();
    const { setIntelligentCalendarPlan } = useDataStore();
    const [planImported, setPlanImported] = useState(false);
    const navigate = useNavigate();

    const handleImport = () => {
        setIntelligentCalendarPlan(report.actionablePlan);
        setPlanImported(true);
        setTimeout(() => navigate('/calendar'), 1500);
    };
    
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
                                    {p.postIdeas.map((idea, i) => <li key={i}>{idea}</li>)}
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
                        <ul className="list-disc list-inside space-y-1 text-sm">{report.swot.strengths.map((s,i) => <li key={i}>{s}</li>)}</ul>
                    </div>
                     <div>
                        <h4 className="font-semibold text-red-600 mb-2">{t('strategist.report.weaknesses')}</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">{report.swot.weaknesses.map((s,i) => <li key={i}>{s}</li>)}</ul>
                    </div>
                     <div>
                        <h4 className="font-semibold text-blue-600 mb-2">{t('strategist.report.opportunities')}</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">{report.swot.opportunities.map((s,i) => <li key={i}>{s}</li>)}</ul>
                    </div>
                     <div>
                        <h4 className="font-semibold text-yellow-600 mb-2">{t('strategist.report.threats')}</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">{report.swot.threats.map((s,i) => <li key={i}>{s}</li>)}</ul>
                    </div>
                </div>
            </div>

             {/* Plan */}
            <div className="p-6 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t('strategist.report.plan')}</h3>
                    <button onClick={handleImport} disabled={planImported} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition disabled:bg-green-600">
                        {planImported ? <><CheckIcon className="w-5 h-5"/> {t('strategist.report.planImported')}</> : <>{t('strategist.report.importPlan')}</>}
                    </button>
                </div>
                <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                    {report.actionablePlan.map(item => (
                         <div key={item.id} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                            <p className="text-xs font-bold text-blue-600">{new Date(item.date + 'T12:00:00Z').toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                            <p className="font-semibold text-sm mt-1">{item.topic}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{item.platform} &bull; {item.format}</p>
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
    const handlers = useAppHandlers(addToast, () => {});
    const { strategicAuditReport, isAuditing, auditError } = useDataStore();

    const [goal, setGoal] = useState('');
    const [audience, setAudience] = useState('');
    const [competitors, setCompetitors] = useState('');
    const [lastSubmittedData, setLastSubmittedData] = useState<{ goal: string; audience: string; competitors: string[] } | null>(null);

    const isStrategistEnabled = [UserPlan.Pro, UserPlan.Agency, UserPlan.Business].includes(userPlan);
    
    if (!isStrategistEnabled) {
        return <LockedState />;
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const competitorList = competitors.split('\n').filter(c => c.trim() !== '');
        setLastSubmittedData({ goal, audience, competitors: competitorList });
        handlers.handleRunStrategicAudit(goal, audience, competitorList);
    }
    
    const handleRetry = () => {
        if (lastSubmittedData) {
            handlers.handleRunStrategicAudit(lastSubmittedData.goal, lastSubmittedData.audience, lastSubmittedData.competitors);
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

    if(strategicAuditReport) {
        return <ReportDisplay report={strategicAuditReport} />;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <div className="text-center">
                <BrainCircuitIcon className="w-16 h-16 mx-auto text-blue-500 mb-4" />
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('strategist.title')}</h1>
                <p className="mt-2 text-slate-500 dark:text-slate-400">{t('strategist.subtitle')}</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg space-y-6">
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
                    <button type="submit" disabled={!goal || !audience} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition disabled:opacity-50">
                        <SparklesIcon className="w-5 h-5"/>
                        {t('strategist.form.submit')}
                    </button>
                </div>
            </form>
        </div>
    );
};