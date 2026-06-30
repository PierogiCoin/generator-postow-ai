import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScheduledPost, CalendarSuggestion, GenerationType, IntelligentCalendarPlanItem, Platform } from '../types';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { platformConfig } from '../config/platformConfig';
import { LayersIcon } from './icons/LayersIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { useDataStore } from '../stores/dataStore';
import { useAuth } from '../contexts/AuthContext';
import { useAppHandlers } from '../hooks/useAppHandlers';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationType } from '../types';
import { generateCalendarSuggestions } from '../services/geminiService';
import { useTranslation } from 'react-i18next';
import { PreviewPopover } from './PreviewPopover';
import { XMarkIcon } from './icons/XMarkIcon';

interface ContentCalendarProps {}

const WEEK_DAYS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];

const isSameDay = (ts1: number | string, date2: Date): boolean => {
    const date1 = new Date(ts1);
    return date1.getUTCFullYear() === date2.getFullYear() &&
        date1.getUTCMonth() === date2.getMonth() &&
        date1.getUTCDate() === date2.getDate();
};

const SuggestionModal: React.FC<{
    suggestions: CalendarSuggestion[];
    isLoading: boolean;
    onClose: () => void;
    onSelect: (suggestion: CalendarSuggestion) => void;
}> = ({ suggestions, isLoading, onClose, onSelect }) => {
    return (
        <div className="absolute inset-0 bg-black/45 backdrop-blur-sm z-[80] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="glass-premium rounded-[2rem] border border-white/10 shadow-2xl p-6 w-full max-w-md relative overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="absolute -top-12 -left-12 w-24 h-24 bg-cyan-500/10 rounded-full blur-[60px]" />
                
                <h4 className="font-bold text-lg text-slate-900 dark:text-white mb-4 relative z-10">Sugestie AI na ten dzień</h4>
                {isLoading ? (
                    <div className="flex items-center justify-center h-40 relative z-10">
                        <svg className="animate-spin h-8 w-8 text-cyan-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                ) : (
                    <div className="space-y-3 relative z-10 max-h-[50vh] overflow-y-auto pr-1.5 custom-scrollbar">
                        {suggestions.map((s, i) => (
                            <div key={`suggestion-${i}`} className="p-4 bg-white/40 dark:bg-slate-950/20 rounded-2xl border border-slate-200/50 dark:border-white/5 hover:border-cyan-500/50 transition-all">
                                <p className="font-bold text-sm text-slate-800 dark:text-white">{s.topic}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">"{s.strategy}"</p>
                                <button onClick={() => onSelect(s)} className="mt-3 text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1">
                                    <SparklesIcon className="w-3.5 h-3.5" />
                                    Użyj pomysłu
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export const ContentCalendar: React.FC<ContentCalendarProps> = () => {
    const { scheduledPosts, history, intelligentCalendarPlan, clearIntelligentCalendarPlan } = useDataStore();
    const { user } = useAuth();
    const { addToast } = useNotifications();
    const handlers = useAppHandlers(() => {}, () => {});
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());
    const { t } = useTranslation();

    const [suggestions, setSuggestions] = useState<CalendarSuggestion[]>([]);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [suggestionDate, setSuggestionDate] = useState<Date | null>(null);
    const [hoveredPost, setHoveredPost] = useState<{ post: ScheduledPost, pos: { top: number, left: number } } | null>(null);

    const changeMonth = (amount: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(prev.getMonth() + amount);
            return newDate;
        });
    };

    const handleSuggest = async (date: Date) => {
        setSuggestionDate(date);
        setIsSuggesting(true);
        try {
            const historySummary = history.slice(0, 5).map(h => h.formData?.topic || "").filter(Boolean).join(", ");
            const niche = localStorage.getItem("userNiche") || "marketing cyfrowy";
            if (!user) throw new Error("Musisz być zalogowany, aby użyć sugestii kalendarza.");
            const result = await generateCalendarSuggestions(date, niche, historySummary, user.id);
            setSuggestions(result);
        } catch (e: any) {
            addToast(e.message || 'Błąd generowania sugestii kalendarza', NotificationType.Error);
        } finally {
            setIsSuggesting(false);
        }
    };

    const handleSelectSuggestion = (suggestion: CalendarSuggestion | IntelligentCalendarPlanItem) => {
        navigate("/generator", {
            state: {
                prefillData: {
                    topic: suggestion.topic || "",
                    generationType: suggestion.format,
                    platform: suggestion.platform,
                }
            }
        });
        setSuggestionDate(null);
    };

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

    const handleDragStart = (e: React.DragEvent, id: string, type: 'post' | 'plan') => {
        e.dataTransfer.setData(type === 'post' ? 'postId' : 'planItemId', id);
        e.dataTransfer.effectAllowed = 'move';
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.classList.add('opacity-50', 'scale-95');
        }
    };

    const handleDragEnd = (e: React.DragEvent) => {
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.classList.remove('opacity-50', 'scale-95');
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
        e.preventDefault();
        const postId = e.dataTransfer.getData('postId');
        const planItemId = e.dataTransfer.getData('planItemId');

        if (postId) {
            const post = scheduledPosts.find(p => p.id === postId);
            if (!post) return;

            const currentTs = new Date(post.scheduleTimestamp);
            const newTs = new Date(targetDate);
            newTs.setHours(currentTs.getHours());
            newTs.setMinutes(currentTs.getMinutes());
            newTs.setSeconds(0);
            newTs.setMilliseconds(0);

            await useDataStore.getState().addOrUpdateScheduledPost({
                ...post,
                scheduleTimestamp: newTs.getTime()
            });
        } else if (planItemId) {
            const formattedDate = targetDate.toISOString().split('T')[0];
            useDataStore.getState().updateIntelligentCalendarPlanItemDate(planItemId, formattedDate);
        }
    };

    const renderCalendarDays = () => {
        const days = [];
        for (let i = 0; i < adjustedFirstDay; i++) {
            days.push(<div key={`empty-${i}`} className="border border-slate-200/40 dark:border-white/5 rounded-2xl bg-slate-50/20 dark:bg-slate-900/10"></div>);
        }
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const postsForDay = scheduledPosts.filter(p => isSameDay(p.scheduleTimestamp, date)).sort((a, b) => a.scheduleTimestamp - b.scheduleTimestamp);
            const planItemsForDay = intelligentCalendarPlan?.filter(p => isSameDay(p.date, date)) || [];

            days.push(
                <div
                    key={day}
                    className="group/day relative border border-slate-200/50 dark:border-white/5 rounded-2xl p-2.5 min-h-[145px] flex flex-col bg-white/40 dark:bg-slate-950/20 hover:bg-white dark:hover:bg-slate-900/40 hover:border-cyan-500/35 transition-all duration-300 shadow-sm"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, date)}
                >
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-350">{day}</span>
                    <div className="flex-grow space-y-2 mt-2 overflow-y-auto pr-0.5 custom-scrollbar">
                        {postsForDay.map(post => {
                            const platform = post.formData?.platform || Platform.Facebook;
                            const config = platformConfig[platform] || platformConfig[Platform.Facebook];
                            const Icon = config.icon;
                            return (
                                <div
                                    key={post.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, post.id, 'post')}
                                    onDragEnd={handleDragEnd}
                                    onMouseEnter={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setHoveredPost({
                                            post,
                                            pos: { top: rect.top, left: rect.right + 10 }
                                        });
                                    }}
                                    onMouseLeave={() => setHoveredPost(null)}
                                    className="group/post relative p-2 rounded-xl bg-slate-100/80 dark:bg-white/5 border-l-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-all animate-scale-in border border-slate-200/50 dark:border-white/5"
                                    style={{ borderLeftColor: config.iconColor ? undefined : '#a855f7' }}
                                    onClick={() => handlers.handleEditScheduledPost(post)}
                                >
                                    <div className="flex items-center gap-1.5">
                                        <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${config.iconColor}`} />
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-bold truncate text-slate-850 dark:text-white uppercase tracking-tighter" title={post.formData?.topic?.replace(/<[^>]*>?/gm, "") || ""}>{post.formData?.topic?.replace(/<[^>]*>?/gm, "") || "Bez tytułu"}</p>
                                            <div className="flex items-center gap-1 text-[9px] text-slate-400 font-bold uppercase">
                                                <CalendarIcon className="w-2.5 h-2.5" />
                                                <span>{new Date(post.scheduleTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover/post:opacity-100 transition-opacity duration-200">
                                        <button onClick={(e) => { e.stopPropagation(); handlers.handleOpenRepurposeModal(post.result); }} className="p-1 bg-white dark:bg-slate-800 rounded-full text-slate-400 hover:text-cyan-500 border border-slate-200/50 dark:border-white/5">
                                            <LayersIcon className="w-2.5 h-2.5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                        {planItemsForDay.map(item => {
                            const config = platformConfig[item.platform] || platformConfig[Platform.Facebook];
                            const Icon = config.icon;
                            return (
                                <div
                                    key={item.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, item.id, 'plan')}
                                    onDragEnd={handleDragEnd}
                                    className="w-full text-left group relative p-2 rounded-xl bg-transparent border border-dashed border-cyan-500/40 hover:border-cyan-500 hover:bg-cyan-500/5 cursor-grab active:cursor-grabbing transition-all"
                                >
                                    <div className="flex items-center gap-1.5" onClick={() => handleSelectSuggestion(item)}>
                                        <Icon className="w-3.5 h-3.5 flex-shrink-0 text-cyan-500" />
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-bold truncate text-slate-855 dark:text-white uppercase tracking-tighter" title={item.topic}>{item.topic}</p>
                                            <p className="text-[8px] font-black uppercase text-cyan-500/70">{t("calendar.suggestion")}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {postsForDay.length === 0 && planItemsForDay.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/day:opacity-100 transition-opacity pointer-events-none z-10">
                            <button onClick={() => handleSuggest(date)} className="pointer-events-auto flex items-center gap-1 px-3 py-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur rounded-full text-[9px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:border-cyan-500 hover:text-cyan-500 hover:shadow shadow-md transition-all transform hover:scale-105 active:scale-95">
                                <SparklesIcon className="w-3.5 h-3.5 text-cyan-500 animate-pulse" />
                                AI Ideas
                            </button>
                        </div>
                    )}
                    {suggestionDate && isSameDay(suggestionDate.getTime(), date) && (
                        <SuggestionModal suggestions={suggestions} isLoading={isSuggesting} onClose={() => setSuggestionDate(null)} onSelect={handleSelectSuggestion} />
                    )}
                </div>
            );
        }
        return days;
    };

    return (
        <div className="glass-premium rounded-[2.5rem] border border-white/10 shadow-2xl p-6 md:p-8 animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[40%] h-56 bg-gradient-to-l from-cyan-500/5 to-transparent pointer-events-none" />

            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-8 gap-4 relative z-10">
                <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter font-sans">
                    {currentDate.toLocaleString("pl-PL", { month: "long", year: "numeric" })}
                </h2>
                <div className="flex items-center gap-4">
                    {intelligentCalendarPlan && (
                        <button onClick={clearIntelligentCalendarPlan} className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1.5">
                            <XMarkIcon className="w-3.5 h-3.5" />
                            Wyczyść plan strategiczny
                        </button>
                    )}
                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                        <button onClick={() => changeMonth(-1)} className="p-2 rounded-xl bg-slate-100/50 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200/50 dark:border-white/5 text-slate-500 dark:text-slate-400 transition"><ArrowLeftIcon className="w-4 h-4" /></button>
                        <button onClick={() => changeMonth(1)} className="p-2 rounded-xl bg-slate-100/50 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200/50 dark:border-white/5 text-slate-500 dark:text-slate-400 transition"><ArrowRightIcon className="w-4 h-4" /></button>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto -mx-2 px-2 pb-2 relative z-10">
                <div className="min-w-[900px]">
                    <div className="grid grid-cols-7 gap-2.5 text-center text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-3">
                        {WEEK_DAYS.map(day => <div key={day} className="py-2">{day}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-2.5">
                        {renderCalendarDays()}
                    </div>
                </div>
            </div>
            {scheduledPosts.length === 0 && !intelligentCalendarPlan && (
                <div className="text-center py-20 text-slate-400 dark:text-slate-500 col-span-7 relative z-10 border border-dashed border-slate-250 dark:border-white/5 rounded-3xl mt-6">
                    <SparklesIcon className="w-12 h-12 mx-auto mb-4 text-cyan-500/60" />
                    <h3 className="text-lg font-black text-slate-800 dark:text-gray-200 uppercase tracking-tight">Kalendarz jest pusty</h3>
                    <p className="mt-2 text-xs max-w-md mx-auto leading-relaxed">Kliknij przycisk "AI Ideas" na wybranym dniu, aby sztuczna inteligencja zaproponowała Ci dedykowane pomysły na posty!</p>
                </div>
            )}
            {hoveredPost && (
                <PreviewPopover
                    result={hoveredPost.post.result}
                    formData={hoveredPost.post.formData}
                    position={hoveredPost.pos}
                />
            )}
        </div>
    );
};
