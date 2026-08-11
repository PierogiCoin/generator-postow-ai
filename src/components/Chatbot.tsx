import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGenerationStore } from '../stores/generationStore';
import { useDataStore } from '../stores/dataStore';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationType, Platform, GenerationType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { generateContent } from '../services/geminiService';
import { getAppLanguageCode } from '../utils/aiLanguage';
import { SparklesIcon } from './icons/SparklesIcon';
import { XMarkIcon } from './icons/XMarkIcon';
import { SendIcon } from './icons/SendIcon';
import { ChatBubbleLeftRightIcon } from './icons/ChatBubbleLeftRightIcon';
import { RocketLaunchIcon } from './icons/RocketLaunchIcon';

interface Message {
  role: 'user' | 'model';
  text: string;
}

export const Chatbot: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { result, lastFormData, updateResultText } = useGenerationStore();
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Context-aware prompt adjustment
  const getContextPrompt = (userPrompt: string) => {
    return `You are an expert Social Media Content Strategist and Assistant. 
    Your goal is to help the user create high-performing content.
    
    CURRENT CONTEXT:
    - User is working on: ${lastFormData?.topic || 'a new project'}
    - Target Platform: ${lastFormData?.platform || 'Social Media'}
    - Selected Tone: ${lastFormData?.tone || 'Professional'}
    - Current Draft: ${result?.postText || 'None yet'}
    
    If the user asks for improvements, focus on hooks, CTA, readability, and engagement.
    If you suggest an updated version of the post, wrap the new content in [UPDATE] tags.

    If the user asks to generate a content calendar or weekly plan, wrap the final list of plan items in [CALENDAR] tags.
    Inside the [CALENDAR] tags, write ONLY a valid JSON array of objects (do not wrap it in markdown code blocks like \`\`\`json ... \`\`\` inside the [CALENDAR] tag).
    Each object must have the following keys:
    - id: string (unique string, e.g. "plan_1", "plan_2")
    - date: string (format YYYY-MM-DD starting from today or next Monday)
    - platform: string (one of: "Facebook", "LinkedIn", "Instagram", "Twitter")
    - topic: string (engaging, creative topic description)
    - format: string (one of: "PostWithImage", "Video", "Idea")
    - strategy: string (brief reason why this topic fits the day/audience)
    
    Always be supportive, creative, and professional.
    
    USER REQUEST: ${userPrompt}`;
  };

  const getWelcomeMessage = () => {
    const topic = lastFormData?.topic || '';
    if (getAppLanguageCode() === 'en') {
      return topic
        ? `Hi! I'm your content assistant. I see you're working on a post about "${topic}". How can I help?`
        : "Hi! I'm your content assistant. How can I help with your post today?";
    }
    return topic
      ? `Cześć! Jestem Twoim asystentem treści. Widzę, że pracujesz nad postem o "${topic}". W czym mogę Ci pomóc?`
      : 'Cześć! Jestem Twoim asystentem treści. W czym mogę Ci pomóc przy Twoim poście?';
  };

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{ role: 'model', text: getWelcomeMessage() }]);
    }
  }, [isOpen, messages.length, lastFormData, i18n.language]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (overrideInput?: string) => {
    const messageToSend = overrideInput || input;
    if (!messageToSend.trim() || isLoading || !user) return;

    if (!overrideInput) setInput('');
    
    const userMessage: Message = { role: 'user', text: messageToSend };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const chatHistory = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const response = await generateContent({
        model: 'gemini-1.5-flash',
        contents: [
            ...chatHistory,
            { role: 'user', parts: [{ text: getContextPrompt(messageToSend) }] }
        ]
      }, user.id);

      const modelResponse = response.text ?? '';
      setMessages(prev => [...prev, { role: 'model', text: modelResponse }]);

      // Check for [UPDATE] tag
      if (modelResponse.includes('[UPDATE]')) {
        // We already have a button logic in the render
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Przepraszam, wystąpił błąd podczas połączenia z AI.';
      setMessages(prev => [...prev, { role: 'model', text: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickActions = [
    { label: '🔥 Wzmocnij hook', prompt: 'Popraw początek (hook) tego posta, aby był bardziej wciągający. Zacznij od razu od poprawionej wersji w tagach [UPDATE].' },
    { label: '✨ Dodaj emoji', prompt: 'Dodaj odpowiednie emoji do tego posta, zachowując profesjonalizm. Zacznij od razu od poprawionej wersji w tagach [UPDATE].' },
    { label: '📅 Kalendarz 7 dni', prompt: 'Wygeneruj kompletny kalendarz publikacji na kolejne 7 dni oparty na aktualnym temacie/niszy. Przedstaw go w tagach [CALENDAR] w formacie JSON zawierającym tablicę obiektów z polami id, date, platform, topic, format, strategy.' },
    { label: '🔍 Wyszukaj trendy', prompt: 'Wyszukaj aktualne i wschodzące trendy rynkowe (content gaps/news) powiązane z tematem mojego posta i zaproponuj 3 kreatywne pomysły na treści na ich podstawie.' },
  ];

  const applyUpdate = (text: string) => {
    const match = text.match(/\[UPDATE\]\n?([\s\S]*)/);
    if (match && match[1]) {
      updateResultText(match[1].trim());
      setMessages(prev => [...prev, { role: 'model', text: '✅ Tekst został zaktualizowany w edytorze!' }]);
    }
  };

  const applyCalendar = async (text: string) => {
    try {
      const match = text.match(/\[CALENDAR\]\n?([\s\S]*)/);
      if (match && match[1]) {
        let jsonStr = match[1].trim();
        if (jsonStr.startsWith('```json')) {
          jsonStr = jsonStr.substring(7);
        }
        if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.substring(3);
        }
        if (jsonStr.endsWith('```')) {
          jsonStr = jsonStr.substring(0, jsonStr.length - 3);
        }
        jsonStr = jsonStr.trim();
        
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) {
          const { setIntelligentCalendarPlan, intelligentCalendarPlan } = useDataStore.getState();
          const { mergeCalendarPlans } = await import('../services/calendarCadenceService');
          
          const formattedItems = parsed.map((item: Record<string, unknown>, idx: number) => {
            const nextDate = new Date();
            nextDate.setDate(nextDate.getDate() + idx);
            const dateStr = nextDate.toISOString().split('T')[0];

            return {
              id: (item.id as string) || `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              date: (item.date as string) || dateStr,
              platform: (item.platform as Platform) || Platform.Facebook,
              topic: (item.topic as string) || 'Temat posta',
              format: (item.format as GenerationType) || GenerationType.PostWithImage,
              strategy: (item.strategy as string) || '',
            };
          });
          
          await setIntelligentCalendarPlan(mergeCalendarPlans(intelligentCalendarPlan, formattedItems));
          setMessages(prev => [...prev, { role: 'model', text: '✅ Kalendarz treści został zaktualizowany! Przejdź do widoku kalendarza, aby go zobaczyć.' }]);
        }
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', text: '❌ Nie udało się przetworzyć kalendarza. Upewnij się, że AI zwróciło poprawną strukturę JSON.' }]);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 text-white p-3.5 rounded-lg hover:brightness-110 transition-all z-[60] group"
        style={{ backgroundColor: 'var(--hero-accent)' }}
        aria-label={t('chatbot.open', 'Otwórz asystenta AI')}
      >
        <SparklesIcon className="w-7 h-7 group-hover:animate-pulse" />
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-bounce">AI</span>
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-full max-w-sm h-[600px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg border border-slate-200 dark:border-white/10 shadow-xl flex flex-col animate-fade-in-up z-[60] overflow-hidden">
          <div className="p-5 text-white flex justify-between items-center"
            style={{ backgroundColor: 'var(--hero-accent)' }}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                <ChatBubbleLeftRightIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-display font-extrabold text-sm tracking-tight">Content AI</h3>
                <p className="text-[10px] opacity-80 font-bold">Twój strateg treści jest online</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-3 sm:p-1.5 hover:bg-white/20 rounded-xl transition-colors touch-manipulation">
              <XMarkIcon className="w-6 h-6 sm:w-5 sm:h-5" />
            </button>
          </div>
          
          <div className="flex-grow p-4 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950/50">
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div key={`msg-${msg.role}-${msg.text?.slice(0, 20) || 'no-content'}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`} style={{ animationDelay: `${index * 0.1}s` }}>
                  <div
                    className={`max-w-[85%] sm:max-w-[85%] p-3 sm:p-3.5 rounded-2xl shadow-sm transition-all duration-300 hover:shadow-md group ${msg.role === 'user'
                      ? 'bg-[var(--hero-accent)] text-white rounded-tr-none'
                      : 'bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-none hover:scale-[1.02] hover:shadow-lg hover:border-[var(--hero-accent)]/40'
                      }`}
                  >
                    <p className="text-xs sm:text-xs leading-relaxed whitespace-pre-wrap transition-colors duration-300 font-medium group-hover:text-white group-hover:drop-shadow-sm">{msg.text}</p>
                    {msg.text.includes('[UPDATE]') && (
                      <button 
                        type="button"
                        onClick={() => applyUpdate(msg.text)}
                        className="mt-3 w-full py-2.5 sm:py-2 bg-[var(--hero-accent)] hover:brightness-110 text-white text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 touch-manipulation min-h-[44px]"
                      >
                        <RocketLaunchIcon className="w-3 h-3 sm:w-3 sm:h-3 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" /> Zastosuj w edytorze
                      </button>
                    )}
                    {msg.text.includes('[CALENDAR]') && (
                      <button 
                        type="button"
                        onClick={() => applyCalendar(msg.text)}
                        className="mt-3 w-full py-2.5 sm:py-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white text-[10px] sm:text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 flex items-center justify-center gap-2 touch-manipulation min-h-[44px] hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/25"
                      >
                        <RocketLaunchIcon className="w-3 h-3 sm:w-3 sm:h-3 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" /> Zastosuj w kalendarzu
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start animate-fade-in-up">
                  <div className="p-4 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-[var(--hero-accent)] rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-[var(--hero-accent)] rounded-full animate-bounce" style={{ animationDelay: '-0.3s' }}></div>
                        <div className="w-2 h-2 bg-[var(--hero-accent)] rounded-full animate-bounce" style={{ animationDelay: '-0.5s' }}></div>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium animate-pulse">AI pisze...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions Panel */}
          {result && (
            <div className="px-4 py-3 sm:px-4 sm:py-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <p className="text-[9px] sm:text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2.5 sm:mb-2.5 flex items-center gap-1.5 sm:gap-1.5">
                <RocketLaunchIcon className="w-3 h-3 sm:w-3 sm:h-3 text-[var(--hero-accent)]" /> Szybkie ulepszenia
              </p>
              <div className="grid grid-cols-2 gap-2 sm:gap-2">
                {quickActions.map((action, i) => (
                  <button
                    key={`action-${action.label}`}
                    onClick={() => handleSend(action.prompt)}
                    disabled={isLoading}
                    className="text-[10px] sm:text-[10px] font-bold p-3 sm:p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl hover:border-[var(--hero-accent)]/50 hover:bg-[var(--hero-accent-soft)] hover:text-[var(--hero-accent)] transition-all text-left truncate touch-manipulation min-h-[44px] sm:min-h-[40px]"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="relative group">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Zapytaj asystenta..."
                rows={1}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 sm:py-3.5 pl-4 pr-14 sm:pr-12 text-xs sm:text-xs focus:ring-2 focus:ring-[var(--hero-accent)] transition-all resize-none shadow-inner touch-manipulation min-h-[48px] sm:min-h-[44px]"
                disabled={isLoading}
              />
              <button
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-3 sm:p-2 bg-[var(--hero-accent)] text-white rounded-lg hover:brightness-110 transition-all disabled:opacity-50 shadow-lg touch-manipulation"
                aria-label={t('chatbot.send', 'Wyślij wiadomość')}
              >
                <SendIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;