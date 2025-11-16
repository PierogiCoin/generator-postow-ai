import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ScheduledPost, CalendarSuggestion, GenerationType, IntelligentCalendarPlanItem } from '../types';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { platformConfig } from '../config/platformConfig';
import { LayersIcon } from './icons/LayersIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { useDataStore } from '../stores/dataStore';
import { useAuth } from '../contexts/AuthContext';
import { useAppHandlers } from '../hooks/useAppHandlers';
import { generateCalendarSuggestions } from '../services/geminiService';
import { useTranslation } from 'react-i18next';


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
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm z-10 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h4 className="font-bold text-lg text-slate-800 dark:text-white mb-4">Sugestie AI na ten dzień</h4>
                {isLoading ? (
                    <div className="flex items-center justify-center h-40">
                         <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {suggestions.map((s, i) => (
                            <div key={i} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                                <p className="font-semibold text-sm text-slate-800 dark:text-white">{s.topic}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">{s.strategy}</p>
                                <button onClick={() => onSelect(s)} className="mt-2 text-xs font-bold text-blue-600 hover:underline">Użyj pomysłu</button>
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
  const handlers = useAppHandlers(() => {}, () => {});
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const { t } = useTranslation();
  
  const [suggestions, setSuggestions] = useState<CalendarSuggestion[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionDate, setSuggestionDate] = useState<Date | null>(null);

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
        const historySummary = history.slice(0, 5).map(h => h.formData.topic).join(', ');
        const niche = localStorage.getItem('userNiche') || 'marketing cyfrowy';
        if (!user) throw new Error('Musisz być zalogowany, aby użyć sugestii kalendarza.');
        const result = await generateCalendarSuggestions(date, niche, historySummary, user.id);
        setSuggestions(result);
    } catch (e) {
        console.error("Błąd podczas generowania sugestii:", e);
    } finally {
        setIsSuggesting(false);
    }
  };
  
  const handleSelectSuggestion = (suggestion: CalendarSuggestion | IntelligentCalendarPlanItem) => {
    navigate('/generator', {
      state: {
        prefillData: {
          topic: suggestion.topic,
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

  const renderCalendarDays = () => {
    const days = [];
    for (let i = 0; i < adjustedFirstDay; i++) {
      days.push(<div key={`empty-${i}`} className="border border-slate-200 dark:border-slate-700/50 rounded-md bg-slate-50 dark:bg-slate-800/30"></div>);
    }
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const postsForDay = scheduledPosts.filter(p => isSameDay(p.scheduleTimestamp, date)).sort((a,b) => a.scheduleTimestamp - b.scheduleTimestamp);
        const planItemsForDay = intelligentCalendarPlan?.filter(p => isSameDay(p.date, date)) || [];

        days.push(
            <div key={day} className="relative border border-slate-200 dark:border-slate-700/50 rounded-md p-2 min-h-[140px] flex flex-col bg-white dark:bg-slate-800/50">
                <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{day}</span>
                <div className="flex-grow space-y-2 mt-2 overflow-y-auto">
                    {postsForDay.map(post => {
                        const config = platformConfig[post.formData.platform];
                        const Icon = config.icon;
                        return (
                            <div key={post.id} className="group relative p-2 rounded-md bg-slate-100 dark:bg-slate-900/50 border-l-4" style={{ borderColor: config.color.replace('bg-', 'border-') }}>
                                <div className="flex items-center gap-2">
                                    <Icon className={`w-4 h-4 flex-shrink-0 ${config.iconColor}`} />
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold truncate text-slate-800 dark:text-white" title={post.formData.topic.replace(/<[^>]*>?/gm, '')}>{post.formData.topic.replace(/<[^>]*>?/gm, '')}</p>
                                        <button 
                                            onClick={() => handlers.handleEditScheduledPost(post)} 
                                            className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
                                            title="Zmień datę i godzinę"
                                        >
                                            <CalendarIcon className="w-3 h-3"/>
                                            <span>{new Date(post.scheduleTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                   <button onClick={() => handlers.handleOpenRepurposeModal(post.result)} className="p-1.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-full text-slate-500 dark:text-slate-400 hover:text-blue-500" title="Przetwórz">
                                       <LayersIcon className="w-3 h-3" />
                                   </button>
                                </div>
                            </div>
                        )
                    })}
                    {planItemsForDay.map(item => {
                        const config = platformConfig[item.platform];
                        const Icon = config.icon;
                        return (
                             <button key={item.id} onClick={() => handleSelectSuggestion(item)} className="w-full text-left group relative p-2 rounded-md bg-transparent border-2 border-dashed border-blue-400/50 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all">
                                <div className="flex items-center gap-2">
                                    <Icon className={`w-4 h-4 flex-shrink-0 text-blue-500`} />
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold truncate text-slate-800 dark:text-white" title={item.topic}>{item.topic}</p>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400">{t('calendar.suggestion')}</p>
                                    </div>
                                </div>
                            </button>
                        )
                    })}
                </div>
                {postsForDay.length === 0 && planItemsForDay.length === 0 && (
                     <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <button onClick={() => handleSuggest(date)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-full text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400">
                            <SparklesIcon className="w-4 h-4"/>
                            Zaproponuj post
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
    <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {currentDate.toLocaleString('pl-PL', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex items-center gap-2 self-end sm:self-center">
                <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><ArrowLeftIcon className="w-5 h-5" /></button>
                <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><ArrowRightIcon className="w-5 h-5" /></button>
            </div>
        </div>

        {intelligentCalendarPlan && (
            <div className="mb-4 p-3 bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <SparklesIcon className="w-6 h-6 text-blue-600 dark:text-blue-300" />
                    <div>
                        <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">{t('calendar.planActive')}</p>
                    </div>
                </div>
                <button onClick={clearIntelligentCalendarPlan} className="text-xs font-bold text-blue-700 dark:text-blue-300 hover:underline">{t('calendar.clearStrategicPlan')}</button>
            </div>
        )}

        <div className="overflow-x-auto -mx-2 px-2 pb-2">
            <div className="min-w-[900px]">
                <div className="grid grid-cols-7 gap-2 text-center text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                    {WEEK_DAYS.map(day => <div key={day} className="py-2">{day}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-2">
                    {renderCalendarDays()}
                </div>
            </div>
        </div>
         {scheduledPosts.length === 0 && !intelligentCalendarPlan && (
             <div className="text-center py-20 text-gray-400 dark:text-gray-500 col-span-7">
                <SparklesIcon className="w-12 h-12 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Kalendarz jest pusty</h3>
                <p className="mt-2 text-sm">Kliknij na pusty dzień, aby AI zaproponowała Ci pomysły na posty!</p>
             </div>
         )}
    </div>
  );
};