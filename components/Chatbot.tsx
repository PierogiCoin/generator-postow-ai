import React, { useState, useRef, useEffect } from 'react';
import { useGenerationStore } from '../stores/generationStore';
import { useAuth } from '../contexts/AuthContext';
import { generateContent } from '../services/geminiService';
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
    
    Always be supportive, creative, and professional. Speak in Polish.
    
    USER REQUEST: ${userPrompt}`;
  };

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{ role: 'model', text: 'Cześć! Jestem Twoim asystentem treści. Widzę, że pracujesz nad postem o "' + (lastFormData?.topic || 'czymś ciekawym') + '". W czym mogę Ci pomóc?' }]);
    }
  }, [isOpen, messages.length, lastFormData]);

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

      const modelResponse = response.text;
      setMessages(prev => [...prev, { role: 'model', text: modelResponse }]);

      // Check for [UPDATE] tag
      if (modelResponse.includes('[UPDATE]')) {
        // We already have a button logic in the render
      }

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'model', text: 'Przepraszam, wystąpił błąd podczas połączenia z AI.' }]);
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
    { label: '✂️ Skróć tekst', prompt: 'Skróć ten tekst, zachowując najważniejsze informacje. Zacznij od razu od poprawionej wersji w tagach [UPDATE].' },
    { label: '🚀 Dodaj CTA', prompt: 'Dodaj na końcu silne wezwanie do działania (CTA). Zacznij od razu od poprawionej wersji w tagach [UPDATE].' },
  ];

  const applyUpdate = (text: string) => {
    const match = text.match(/\[UPDATE\]\n?([\s\S]*)/);
    if (match && match[1]) {
      updateResultText(match[1].trim());
      setMessages(prev => [...prev, { role: 'model', text: '✅ Tekst został zaktualizowany w edytorze!' }]);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-2xl shadow-2xl hover:scale-110 hover:rotate-3 transition-all z-[60] group"
        aria-label="Open AI Chatbot"
      >
        <SparklesIcon className="w-7 h-7 group-hover:animate-pulse" />
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-bounce">AI</span>
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-full max-w-sm h-[600px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col animate-fade-in-up z-[60] overflow-hidden">
          <div className="p-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                <ChatBubbleLeftRightIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-black text-sm uppercase tracking-wider">Content AI</h3>
                <p className="text-[10px] opacity-80 font-bold">Twój strateg treści jest online</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-grow p-4 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950/50">
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl shadow-sm ${msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-none'
                      }`}
                  >
                    <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    {msg.text.includes('[UPDATE]') && (
                      <button 
                        onClick={() => applyUpdate(msg.text)}
                        className="mt-3 w-full py-2 bg-green-500 hover:bg-green-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <RocketLaunchIcon className="w-3 h-3" /> Zastosuj w edytorze
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.5s]"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions Panel */}
          {result && (
            <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2.5 flex items-center gap-1.5">
                <RocketLaunchIcon className="w-3 h-3 text-indigo-500" /> Szybkie ulepszenia
              </p>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(action.prompt)}
                    disabled={isLoading}
                    className="text-[10px] font-bold p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl hover:border-indigo-500/50 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 transition-all text-left truncate"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="relative group">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Zapytaj asystenta..."
                rows={1}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3.5 pl-4 pr-12 text-xs focus:ring-2 focus:ring-indigo-500 transition-all resize-none shadow-inner"
                disabled={isLoading}
              />
              <button
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg"
                aria-label="Send message"
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