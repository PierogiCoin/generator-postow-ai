import React from 'react';
import type { GenerationResult, FormData, AIAssistantAction } from '../types';
import { Platform } from '../types';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { EllipsisHorizontalIcon } from './icons/EllipsisHorizontalIcon';
import { HeartIcon } from './icons/HeartIcon';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';
import { ShareIcon } from './icons/ShareIcon';
import { BookmarkIcon } from './icons/BookmarkIcon';
import { MusicNoteIcon } from './icons/MusicNoteIcon';
import { ThumbsUpIcon } from './icons/ThumbsUpIcon';
import { PencilIcon } from './icons/PencilIcon';
import { VideoPlayer } from './VideoPlayer';
import { InteractiveEditor } from './ai/InteractiveEditor';
import { SendIcon } from './icons/SendIcon';
import { DislikeIcon } from './icons/DislikeIcon';
import { FilmIcon } from './icons/FilmIcon';

interface PostPreviewProps {
  result: GenerationResult;
  formData: FormData | null;
  onEditImage?: () => void;
  hideText?: boolean;
  onUpdateResult: (result: GenerationResult) => void;
  onAIAssistantAction: (action: AIAssistantAction, selectedText: string, fullText: string, contextFormData: FormData | null) => void;
  isAssistantLoading: boolean;
  streaming?: boolean;
  lite?: boolean;
}

const XPreview: React.FC<PostPreviewProps> = ({ result, formData, onEditImage, hideText, onUpdateResult, onAIAssistantAction, isAssistantLoading, streaming, lite }) => (
  <div className={`border-2 border-slate-100 dark:border-slate-800 ${lite ? 'rounded-2xl border-none p-2' : 'rounded-[2rem] p-6'} bg-white dark:bg-slate-900/50 max-w-full text-sm shadow-xl shadow-slate-200/50 dark:shadow-none`}>
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0 relative">
        <UserCircleIcon className="w-12 h-12 text-slate-300 dark:text-slate-700" />
        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center">
          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
        </div>
      </div>
      <div className="flex-grow min-w-0 overflow-hidden">
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
            <span className="font-black text-slate-900 dark:text-white truncate whitespace-normal">Twoja Marka</span>
            <span className="text-slate-500 dark:text-slate-500 truncate whitespace-normal">@twojamarka</span>
            <span className="text-slate-400 dark:text-slate-600">&middot; Teraz</span>
          </div>
          <EllipsisHorizontalIcon className="w-5 h-5 text-slate-400 dark:text-slate-600" />
        </div>
        {!hideText && (
          <div className="relative group/editor">
            <InteractiveEditor
              lite
              className="text-[15px] leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap mt-1"
              value={result.postText}
              onChange={(newText) => onUpdateResult({ ...result, postText: newText })}
              onAction={onAIAssistantAction}
              isLoading={isAssistantLoading}
              formData={formData}
              streaming={streaming}
            />
          </div>
        )}
        <div className="relative group mt-4 overflow-hidden rounded-[1.5rem] border-2 border-slate-100 dark:border-slate-800 shadow-lg">
          {result.videoUrl ? (
            <div className="aspect-video bg-black overflow-hidden">
              <VideoPlayer src={result.videoUrl} className="w-full h-full object-cover" />
            </div>
          ) : result.imageUrl && (
            <>
              <img src={result.imageUrl} alt="Podgląd posta" className="w-full object-cover aspect-video hover:scale-105 transition-transform duration-700" />
              {onEditImage && (
                <button
                  onClick={onEditImage}
                  className="absolute top-4 right-4 flex items-center gap-2 bg-black/60 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-black/80"
                >
                  <PencilIcon className="w-3 h-3" />
                  Edytuj
                </button>
              )}
            </>
          )}
        </div>
        <div className="flex justify-between text-slate-500 dark:text-slate-500 mt-5 px-1 max-w-sm">
          <button className="flex items-center gap-2 group transition-colors hover:text-blue-500"><div className="p-2 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20"><ChatBubbleIcon className="w-5 h-5" /></div> <span className="text-xs font-bold">12</span></button>
          <button className="flex items-center gap-2 group transition-colors hover:text-green-500"><div className="p-2 rounded-full group-hover:bg-green-50 dark:group-hover:bg-green-900/20"><ShareIcon className="w-5 h-5" /></div> <span className="text-xs font-bold">34</span></button>
          <button className="flex items-center gap-2 group transition-colors hover:text-rose-500"><div className="p-2 rounded-full group-hover:bg-rose-50 dark:group-hover:bg-rose-900/20"><HeartIcon className="w-5 h-5" /></div> <span className="text-xs font-bold">156</span></button>
          <button className="group transition-colors hover:text-blue-500"><div className="p-2 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20"><BookmarkIcon className="w-5 h-5" /></div></button>
        </div>
      </div>
    </div>
  </div>
);

const FacebookPreview: React.FC<PostPreviewProps> = ({ result, formData, onEditImage, hideText, onUpdateResult, onAIAssistantAction, isAssistantLoading, streaming, lite }) => (
  <div className={`border-2 border-slate-100 dark:border-slate-800 ${lite ? 'rounded-2xl border-none' : 'rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none'} bg-white dark:bg-slate-900/50 max-w-full overflow-hidden text-sm`}>
    <div className="p-4 flex items-center gap-3">
      <UserCircleIcon className="w-12 h-12 text-slate-300 dark:text-slate-700" />
      <div>
        <p className="font-black text-slate-900 dark:text-white">Twoja Marka</p>
        <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 dark:text-slate-600">Sponsorowane &middot; Teraz</p>
      </div>
      <div className="flex-grow" />
      <EllipsisHorizontalIcon className="w-5 h-5 text-slate-400 dark:text-slate-600" />
    </div>
    {!hideText && (
      <InteractiveEditor
        lite
        className="px-5 pb-4 text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed"
        value={result.postText}
        onChange={(newText) => onUpdateResult({ ...result, postText: newText })}
        onAction={onAIAssistantAction}
        isLoading={isAssistantLoading}
        formData={formData}
        streaming={streaming}
      />
    )}
    <div className="relative group w-full bg-slate-100 dark:bg-slate-900 h-[400px]">
      {result.videoUrl ? (
        <VideoPlayer src={result.videoUrl} className="w-full h-full object-cover bg-black" />
      ) : result.imageUrl && (
        <>
          <img src={result.imageUrl} alt="Podgląd posta" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          {onEditImage && (
            <button
              onClick={onEditImage}
              className="absolute top-4 right-4 flex items-center gap-2 bg-black/60 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-black/80"
            >
              <PencilIcon className="w-3 h-3" />
              Edytuj
            </button>
          )}
        </>
      )}
    </div>
    <div className="px-4 py-3 flex justify-between items-center text-xs text-slate-500 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
      <div className="flex items-center gap-1.5 font-bold">
        <div className="flex -space-x-1">
          <span className="bg-blue-500 p-1 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
            <ThumbsUpIcon className="w-2.5 h-2.5 text-white" strokeWidth="3" />
          </span>
          <span className="bg-rose-500 p-1 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
            <HeartIcon className="w-2.5 h-2.5 text-white" strokeWidth="3" />
          </span>
        </div>
        <span>1.2K osób lubi to</span>
      </div>
      <div className="font-bold">
        <span>256 komentarzy</span>
        <span className="ml-3">89 udostępnień</span>
      </div>
    </div>
    <div className="p-1 flex justify-around text-slate-600 dark:text-slate-400 font-black uppercase text-[10px] tracking-widest">
      <button className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"><ThumbsUpIcon className="w-5 h-5" /> Lubię to!</button>
      <button className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"><ChatBubbleIcon className="w-5 h-5" /> Komentarz</button>
      <button className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"><ShareIcon className="w-5 h-5" /> Udostępnij</button>
    </div>
  </div>
);

const InstagramPreview: React.FC<PostPreviewProps> = ({ result, formData, onEditImage, hideText, onUpdateResult, onAIAssistantAction, isAssistantLoading, streaming, lite }) => (
  <div className={`border-2 border-slate-100 dark:border-slate-800 ${lite ? 'rounded-2xl border-none' : 'rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none'} bg-white dark:bg-slate-900/50 max-w-full overflow-hidden text-sm`}>
    <div className="p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full p-0.5 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600">
        <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 p-0.5">
          <UserCircleIcon className="w-full h-full text-slate-300 dark:text-slate-700" />
        </div>
      </div>
      <p className="font-black text-slate-900 dark:text-white">twojamarka</p>
      <div className="flex-grow" />
      <EllipsisHorizontalIcon className="w-5 h-5 text-slate-400 dark:text-slate-600" />
    </div>
    <div className="relative group w-full aspect-square bg-slate-100 dark:bg-slate-900">
      {result.videoUrl ? (
        <VideoPlayer src={result.videoUrl} className="w-full h-full object-cover bg-black" />
      ) : result.imageUrl && (
        <>
          <img src={result.imageUrl} alt="Podgląd posta" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          {onEditImage && (
            <button
              onClick={onEditImage}
              className="absolute top-4 right-4 flex items-center gap-2 bg-black/60 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-black/80"
            >
              <PencilIcon className="w-3 h-3" />
              Edytuj
            </button>
          )}
        </>
      )}
    </div>
    <div className="p-5">
      <div className="flex items-center flex-wrap gap-5">
        <HeartIcon className="w-7 h-7 text-slate-800 dark:text-slate-200 hover:scale-110 transition-transform cursor-pointer" />
        <ChatBubbleIcon className="w-7 h-7 text-slate-800 dark:text-slate-200 hover:scale-110 transition-transform cursor-pointer" />
        <ShareIcon className="w-7 h-7 text-slate-800 dark:text-slate-200 hover:scale-110 transition-transform cursor-pointer" />
        <div className="flex-grow" />
        <BookmarkIcon className="w-7 h-7 text-slate-800 dark:text-slate-200 hover:scale-110 transition-transform cursor-pointer" />
      </div>
      <p className="font-black mt-4 text-slate-900 dark:text-white">1,234 polubień</p>
      {!hideText && (
        <div className="mt-2 text-slate-800 dark:text-slate-200 leading-relaxed">
          <span className="font-black mr-1.5">twojamarka</span>
          <InteractiveEditor
            lite
            inline
            className="whitespace-pre-wrap"
            value={result.postText}
            onChange={(newText) => onUpdateResult({ ...result, postText: newText })}
            onAction={onAIAssistantAction}
            isLoading={isAssistantLoading}
            formData={formData}
            streaming={streaming}
          />
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {result.hashtags.map(h => <span key={h} className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer">#{h.replace('#', '')}</span>)}
      </div>
      <p className="text-xs font-bold text-slate-400 dark:text-slate-600 mt-4 uppercase tracking-widest hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">
        Zobacz wszystkie 56 komentarzy
      </p>
      <div className="flex items-center gap-3 mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
        <UserCircleIcon className="w-8 h-8 text-slate-200 dark:text-slate-800" />
        <p className="text-sm font-bold text-slate-400 dark:text-slate-600">Dodaj komentarz...</p>
      </div>
    </div>
  </div>
);

const TikTokPreview: React.FC<PostPreviewProps> = ({ result, formData, hideText, onUpdateResult, onAIAssistantAction, isAssistantLoading, streaming }) => (
  <div className="relative bg-black rounded-[3rem] overflow-hidden aspect-[9/16] max-w-[320px] mx-auto shadow-2xl border-[6px] border-slate-900 dark:border-black outline outline-2 outline-slate-800/30">
    {result.videoUrl ? (
      <VideoPlayer src={result.videoUrl} className="w-full h-full object-cover" />
    ) : (
      <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-white p-8 text-center italic opacity-50">
        <FilmIcon className="w-12 h-12 mb-4 animate-pulse" />
        Brak podglądu wideo
      </div>
    )}
    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
    <div className="absolute bottom-0 left-0 right-0 p-6 text-white text-sm">
      <p className="font-black text-lg mb-2">@twojamarka</p>
      {!hideText && (
        <InteractiveEditor
          lite
          className="mt-1 whitespace-pre-wrap text-sm leading-snug drop-shadow-md"
          value={result.postText}
          onChange={(newText) => onUpdateResult({ ...result, postText: newText })}
          onAction={onAIAssistantAction}
          isLoading={isAssistantLoading}
          formData={formData}
          streaming={streaming}
        />
      )}
      <div className="flex items-center gap-3 mt-4 text-xs font-black uppercase tracking-widest bg-white/10 w-fit px-3 py-1.5 rounded-full backdrop-blur-md">
        <MusicNoteIcon className="w-4 h-4 animate-spin-slow" />
        <span>Oryginalny dźwięk</span>
      </div>
    </div>
    <div className="absolute right-4 bottom-1/4 flex flex-col items-center gap-6 text-white">
      <div className="relative">
        <UserCircleIcon className="w-14 h-14 bg-white text-slate-900 rounded-full border-2 border-white shadow-xl" />
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-rose-500 w-5 h-5 rounded-full flex items-center justify-center text-white font-black text-[10px] ring-2 ring-white">+</div>
      </div>
      <div className="text-center group cursor-pointer">
        <div className="bg-black/20 p-2 rounded-full backdrop-blur-md group-hover:scale-110 transition-transform">
          <HeartIcon className="w-9 h-9" />
        </div>
        <span className="text-xs font-black drop-shadow-md mt-1 block">12.3k</span>
      </div>
      <div className="text-center group cursor-pointer">
        <div className="bg-black/20 p-2 rounded-full backdrop-blur-md group-hover:scale-110 transition-transform">
          <ChatBubbleIcon className="w-9 h-9" />
        </div>
        <span className="text-xs font-black drop-shadow-md mt-1 block">456</span>
      </div>
      <div className="text-center group cursor-pointer">
        <div className="bg-black/20 p-2 rounded-full backdrop-blur-md group-hover:scale-110 transition-transform">
          <ShareIcon className="w-9 h-9" />
        </div>
        <span className="text-xs font-black drop-shadow-md mt-1 block">789</span>
      </div>
      <div className="w-12 h-12 rounded-full bg-slate-800 border-4 border-slate-700 animate-spin-slow overflow-hidden mt-4">
        <div className="w-full h-full bg-gradient-to-tr from-purple-500 to-pink-500 opacity-50" />
      </div>
    </div>
  </div>
);

const LinkedInPreview: React.FC<PostPreviewProps> = ({ result, formData, onEditImage, hideText, onUpdateResult, onAIAssistantAction, isAssistantLoading, streaming }) => (
  <div className="border-2 border-slate-100 dark:border-slate-800 rounded-[2rem] bg-white dark:bg-slate-900/50 max-w-full shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden text-sm font-sans">
    <div className="p-5 flex items-start gap-4">
      <UserCircleIcon className="w-14 h-14 text-slate-300 dark:text-slate-700" />
      <div className="flex-grow">
        <p className="font-black text-slate-900 dark:text-white">Twoja Firma</p>
        <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 dark:text-slate-600">1,234 obserwujących</p>
        <p className="text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest mt-0.5">Teraz &bull; <span className="inline-flex items-center gap-1">Publiczny <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" /></svg></span></p>
      </div>
      <EllipsisHorizontalIcon className="w-5 h-5 text-slate-400 dark:text-slate-600" />
    </div>
    {!hideText && (
      <InteractiveEditor
        lite
        className="px-5 pb-4 text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed text-[15px]"
        value={result.postText}
        onChange={(newText) => onUpdateResult({ ...result, postText: newText })}
        onAction={onAIAssistantAction}
        isLoading={isAssistantLoading}
        formData={formData}
        streaming={streaming}
      />
    )}

    {(result.imageUrl || result.videoUrl) && (
      <div className="relative group w-full border-y border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
        {result.videoUrl ? (
          <VideoPlayer src={result.videoUrl} className="w-full h-full object-cover bg-black aspect-video" />
        ) : result.imageUrl && (
          <>
            <img src={result.imageUrl} alt="Podgląd posta" className="w-full h-full object-cover max-h-[500px] transition-transform duration-700 group-hover:scale-105" />
            {onEditImage && (
              <button
                onClick={onEditImage}
                className="absolute top-4 right-4 flex items-center gap-2 bg-black/60 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-black/80"
              >
                <PencilIcon className="w-3 h-3" />
                Edytuj
              </button>
            )}
          </>
        )}
      </div>
    )}

    <div className="p-3 px-5 flex justify-around text-slate-600 dark:text-slate-400 font-black uppercase text-[10px] tracking-widest">
      <button className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"><ThumbsUpIcon className="w-5 h-5 text-blue-500" /> Poleć</button>
      <button className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"><ChatBubbleIcon className="w-5 h-5" /> Komentarz</button>
      <button className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"><ShareIcon className="w-5 h-5" /> Udostępnij</button>
      <button className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"><SendIcon className="w-5 h-5" /> Wyślij</button>
    </div>
  </div>
);

const YouTubePreview: React.FC<PostPreviewProps> = ({ result, formData, onEditImage, hideText, onUpdateResult, onAIAssistantAction, isAssistantLoading, streaming, lite }) => (
  <div className={`border-2 border-slate-100 dark:border-slate-800 ${lite ? 'rounded-2xl border-none' : 'rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none'} bg-white dark:bg-slate-900/50 max-w-full overflow-hidden text-sm font-sans`}>
    <div className="relative group w-full aspect-video bg-black overflow-hidden">
      {result.videoUrl ? (
        <VideoPlayer src={result.videoUrl} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
      ) : result.imageUrl ? (
        <img src={result.imageUrl} alt="Podgląd posta" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
      ) : (
        <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-white/30 text-center italic">
          <FilmIcon className="w-12 h-12 mb-2" />
          Brak wideo
        </div>
      )}
      <div className="absolute bottom-4 right-4 bg-black/80 px-2 py-1 rounded text-[10px] font-black text-white">12:34</div>
    </div>
    <div className="p-6">
      <h3 className="font-black text-xl text-slate-900 dark:text-white leading-tight line-clamp-2">{result.videoTitle || formData?.topic || 'Tytuł Twojego Wideo'}</h3>
      <div className="flex items-center gap-3 mt-3 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600">
        <span>123 tys. wyświetleń</span>
        <span>&bull;</span>
        <span>2 dni temu</span>
      </div>

      <div className="flex items-center gap-4 mt-8">
        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center flex-shrink-0">
          <UserCircleIcon className="w-full h-full text-slate-300 dark:text-slate-700" />
        </div>
        <div className="min-w-0">
          <p className="font-black text-slate-900 dark:text-white truncate">Twoja Marka</p>
          <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-600">123 tys. subskrybentów</p>
        </div>
        <button className="ml-auto px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white bg-slate-900 dark:bg-white dark:text-black rounded-full hover:scale-105 transition-transform active:scale-95 shadow-lg shadow-black/10 dark:shadow-white/10">Subskrybuj</button>
      </div>

      <div className="flex items-center gap-3 mt-8 overflow-x-auto pb-2 scrollbar-hide">
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full flex-shrink-0">
          <button className="flex items-center gap-2 pl-5 pr-3 py-2.5 rounded-l-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border-r border-slate-200 dark:border-slate-700">
            <ThumbsUpIcon className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">12 tys.</span>
          </button>
          <button className="pl-3 pr-5 py-2.5 rounded-r-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <DislikeIcon className="w-4 h-4" />
          </button>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex-shrink-0">
          <ShareIcon className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">Udostępnij</span>
        </button>
        <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex-shrink-0">
          <BookmarkIcon className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">Zapisz</span>
        </button>
      </div>

      {!hideText && (
        <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[1.5rem] border-2 border-slate-100 dark:border-slate-800">
          <InteractiveEditor
            lite
            className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap text-xs leading-relaxed"
            value={result.videoDescription || result.postText}
            onChange={(newText) => onUpdateResult({ ...result, videoDescription: newText })}
            onAction={onAIAssistantAction}
            isLoading={isAssistantLoading}
            formData={formData}
            streaming={streaming}
          />
        </div>
      )}
    </div>
  </div>
);


export const PostPreview: React.FC<PostPreviewProps> = (props) => {
  const { result, formData, streaming } = props;

  if (!formData) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/50 rounded-lg">
        Podgląd będzie dostępny po wygenerowaniu treści.
      </div>
    );
  }

  if (!result.imageUrl && !result.videoUrl && !result.postText) {
    return (
      <div className="p-4 text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900/50 rounded-lg text-center">
        <p className="font-semibold">Błąd generowania wizualizacji</p>
        <p className="text-sm mt-1 text-red-400/80">Nie udało się wygenerować obrazu, wideo ani tekstu.</p>
      </div>
    );
  }

  const platform = formData.platform;

  switch (platform) {
    case Platform.X:
      return <XPreview {...props} />;
    case Platform.Facebook:
      return <FacebookPreview {...props} />;
    case Platform.Instagram:
      return <InstagramPreview {...props} />;
    case Platform.TikTok:
      return <TikTokPreview {...props} />;
    case Platform.LinkedIn:
      return <LinkedInPreview {...props} />;
    case Platform.YouTube:
      return <YouTubePreview {...props} />;
    default:
      return <FacebookPreview {...props} />;
  }
};
