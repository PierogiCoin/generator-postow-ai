

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


interface PostPreviewProps {
  result: GenerationResult;
  formData: FormData | null;
  onEditImage?: () => void;
  hideText?: boolean;
  onUpdateResult: (result: GenerationResult) => void;
  onAIAssistantAction: (action: AIAssistantAction, selectedText: string, fullText: string, contextFormData: FormData | null) => void;
  isAssistantLoading: boolean;
}

const XPreview: React.FC<PostPreviewProps> = ({ result, formData, onEditImage, hideText, onUpdateResult, onAIAssistantAction, isAssistantLoading }) => (
  <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-900/50 max-w-full text-sm">
    <div className="flex items-start gap-3">
      <UserCircleIcon className="w-10 h-10 text-gray-400 flex-shrink-0" />
      <div className="flex-grow min-w-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-gray-900 dark:text-white">Twoja Marka</span>
            <span className="text-gray-500 dark:text-gray-400 truncate">@twojamarka</span>
            <span className="text-gray-500 dark:text-gray-400">&middot; Teraz</span>
          </div>
          <EllipsisHorizontalIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </div>
        {!hideText && <InteractiveEditor lite className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap mt-1" value={result.postText} onChange={(newText) => onUpdateResult({ ...result, postText: newText })} onAction={onAIAssistantAction} isLoading={isAssistantLoading} formData={formData} />}
        <div className="relative group mt-3">
          {result.videoUrl ? (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 w-full aspect-video bg-black overflow-hidden">
                <VideoPlayer src={result.videoUrl} className="w-full h-full object-cover" />
            </div>
          ) : result.imageUrl && (
            <>
              <img src={result.imageUrl} alt="Podgląd posta" className="rounded-2xl border border-gray-200 dark:border-gray-700 w-full object-cover aspect-video" />
              {onEditImage && (
                 <button 
                    onClick={onEditImage} 
                    className="absolute top-2 right-2 flex items-center gap-2 bg-black/60 text-white text-xs font-semibold px-3 py-1.5 rounded-md backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                    <PencilIcon className="w-4 h-4"/>
                    Edytuj
                </button>
              )}
            </>
          )}
        </div>
        <div className="flex justify-around flex-wrap text-gray-500 dark:text-gray-400 mt-3 -ml-2">
          <button className="flex items-center gap-1 p-2 rounded-full hover:bg-blue-100/50 dark:hover:bg-blue-900/20 hover:text-blue-500 transition-colors"><ChatBubbleIcon className="w-5 h-5" /> <span>12</span></button>
          <button className="flex items-center gap-1 p-2 rounded-full hover:bg-green-100/50 dark:hover:bg-green-900/20 hover:text-green-500 transition-colors"><ShareIcon className="w-5 h-5" /> <span>34</span></button>
          <button className="flex items-center gap-1 p-2 rounded-full hover:bg-red-100/50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors"><HeartIcon className="w-5 h-5" /> <span>156</span></button>
          <button className="p-2 rounded-full hover:bg-blue-100/50 dark:hover:bg-blue-900/20 hover:text-blue-500 transition-colors"><BookmarkIcon className="w-5 h-5" /></button>
        </div>
      </div>
    </div>
  </div>
);

const FacebookPreview: React.FC<PostPreviewProps> = ({ result, formData, onEditImage, hideText, onUpdateResult, onAIAssistantAction, isAssistantLoading }) => (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800/50 max-w-full shadow-sm text-sm">
        <div className="p-3 flex items-center gap-2">
            <UserCircleIcon className="w-10 h-10 text-gray-400" />
            <div>
                <p className="font-semibold text-gray-900 dark:text-white">Twoja Marka</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Sponsorowane &middot; Teraz</p>
            </div>
            <div className="flex-grow" />
            <EllipsisHorizontalIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </div>
        {!hideText && <InteractiveEditor lite className="px-3 pb-2 text-gray-800 dark:text-gray-200 whitespace-pre-wrap" value={result.postText} onChange={(newText) => onUpdateResult({ ...result, postText: newText })} onAction={onAIAssistantAction} isLoading={isAssistantLoading} formData={formData} />}
        <div className="relative group w-full" style={{ aspectRatio: '1/1' }}>
          {result.videoUrl ? (
              <VideoPlayer src={result.videoUrl} className="w-full h-full object-cover bg-black" />
          ) : result.imageUrl && (
            <>
              <img src={result.imageUrl} alt="Podgląd posta" className="w-full h-full object-cover" />
              {onEditImage && (
                 <button 
                    onClick={onEditImage} 
                    className="absolute top-2 right-2 flex items-center gap-2 bg-black/60 text-white text-xs font-semibold px-3 py-1.5 rounded-md backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                    <PencilIcon className="w-4 h-4"/>
                    Edytuj
                </button>
              )}
            </>
          )}
        </div>
        <div className="px-3 py-2 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
                <span className="bg-blue-500 p-0.5 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-800/50">
                    <ThumbsUpIcon className="w-2.5 h-2.5 text-white" strokeWidth="3" />
                </span>
                <span className="bg-red-500 p-0.5 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-800/50 -ml-2">
                    <HeartIcon className="w-2.5 h-2.5 text-white" strokeWidth="3" />
                </span>
                <span>Ty i 1.2K innych</span>
            </div>
            <div>
                <span>256 komentarzy</span>
                <span className="ml-2">89 udostępnień</span>
            </div>
        </div>
        <div className="mx-2 my-1 h-px bg-gray-200 dark:bg-gray-700" />
        <div className="p-1 flex justify-around text-gray-600 dark:text-gray-400 font-medium">
            <button className="flex-1 flex items-center justify-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"><ThumbsUpIcon className="w-5 h-5" /> Lubię to!</button>
            <button className="flex-1 flex items-center justify-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"><ChatBubbleIcon className="w-5 h-5" /> Komentarz</button>
            <button className="flex-1 flex items-center justify-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"><ShareIcon className="w-5 h-5" /> Udostępnij</button>
        </div>
    </div>
);

const InstagramPreview: React.FC<PostPreviewProps> = ({ result, formData, onEditImage, hideText, onUpdateResult, onAIAssistantAction, isAssistantLoading }) => (
    <div className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 max-w-full text-sm">
        <div className="p-3 flex items-center gap-3">
            <UserCircleIcon className="w-8 h-8 text-gray-400" />
            <p className="font-semibold text-gray-900 dark:text-white">twojamarka</p>
            <div className="flex-grow" />
            <EllipsisHorizontalIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </div>
        <div className="relative group w-full" style={{ aspectRatio: '1/1' }}>
          {result.videoUrl ? (
              <VideoPlayer src={result.videoUrl} className="w-full h-full object-cover bg-black" />
          ) : result.imageUrl && (
            <>
              <img src={result.imageUrl} alt="Podgląd posta" className="w-full h-full object-cover" />
              {onEditImage && (
                 <button 
                    onClick={onEditImage} 
                    className="absolute top-2 right-2 flex items-center gap-2 bg-black/60 text-white text-xs font-semibold px-3 py-1.5 rounded-md backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                    <PencilIcon className="w-4 h-4"/>
                    Edytuj
                </button>
              )}
            </>
          )}
        </div>
        <div className="p-3">
            <div className="flex items-center flex-wrap gap-4">
                <HeartIcon className="w-6 h-6 text-gray-800 dark:text-gray-200" />
                <ChatBubbleIcon className="w-6 h-6 text-gray-800 dark:text-gray-200" />
                <ShareIcon className="w-6 h-6 text-gray-800 dark:text-gray-200" />
                <div className="flex-grow" />
                <BookmarkIcon className="w-6 h-6 text-gray-800 dark:text-gray-200" />
            </div>
            <p className="font-semibold mt-2 text-gray-900 dark:text-white">1,234 polubień</p>
            {!hideText && (
                <div className="mt-1 text-gray-800 dark:text-gray-200">
                    <span className="font-semibold">twojamarka </span>
                    <InteractiveEditor
                        lite
                        inline
                        className="whitespace-pre-wrap"
                        value={result.postText}
                        onChange={(newText) => onUpdateResult({ ...result, postText: newText })}
                        onAction={onAIAssistantAction}
                        isLoading={isAssistantLoading}
                        formData={formData}
                    />
                </div>
            )}
            <div className="mt-1 text-blue-800 dark:text-blue-300">
                {result.hashtags.map(h => <span key={h} className="mr-1">{h}</span>)}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 hover:underline cursor-pointer">
                Zobacz wszystkie 56 komentarzy
            </p>
            <div className="flex items-center gap-2 mt-2">
                <UserCircleIcon className="w-6 h-6 text-gray-400" />
                <p className="text-sm text-gray-400 dark:text-gray-500">Dodaj komentarz...</p>
            </div>
        </div>
    </div>
);

const TikTokPreview: React.FC<PostPreviewProps> = ({ result, formData, hideText, onUpdateResult, onAIAssistantAction, isAssistantLoading }) => (
  <div className="relative bg-black rounded-xl overflow-hidden aspect-[9/16] max-w-[300px] mx-auto shadow-lg border-2 border-gray-600 dark:border-gray-800">
    {result.videoUrl ? (
      <VideoPlayer src={result.videoUrl} className="w-full h-full object-cover" />
    ) : (
      <div className="w-full h-full bg-gray-900 flex items-center justify-center text-white">Brak wideo</div>
    )}
    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
    <div className="absolute bottom-0 left-0 right-0 p-3 text-white text-sm">
      <p className="font-bold">@twojamarka</p>
      {!hideText && <InteractiveEditor lite className="mt-1 whitespace-pre-wrap text-xs" value={result.postText} onChange={(newText) => onUpdateResult({ ...result, postText: newText })} onAction={onAIAssistantAction} isLoading={isAssistantLoading} formData={formData} />}
      <div className="flex items-center gap-2 mt-2 text-xs">
        <MusicNoteIcon className="w-4 h-4" />
        <span>Oryginalny dźwięk - twojamarka</span>
      </div>
    </div>
    <div className="absolute right-2 bottom-20 flex flex-col items-center gap-4 text-white">
      <UserCircleIcon className="w-12 h-12 bg-white text-gray-800 rounded-full border-2 border-white" />
      <div className="text-center">
        <HeartIcon className="w-8 h-8" />
        <span className="text-xs font-semibold">12.3k</span>
      </div>
      <div className="text-center">
        <ChatBubbleIcon className="w-8 h-8" />
        <span className="text-xs font-semibold">456</span>
      </div>
      <div className="text-center">
        <ShareIcon className="w-8 h-8" />
        <span className="text-xs font-semibold">789</span>
      </div>
    </div>
  </div>
);

const LinkedInPreview: React.FC<PostPreviewProps> = ({ result, formData, onEditImage, hideText, onUpdateResult, onAIAssistantAction, isAssistantLoading }) => (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800/50 max-w-full shadow-sm text-sm font-sans">
        <div className="p-3 flex items-start gap-3">
            <UserCircleIcon className="w-12 h-12 text-gray-400" />
            <div className="flex-grow">
                <p className="font-semibold text-gray-900 dark:text-white">Twoja Firma</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">1,234 obserwujących</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Teraz</p>
            </div>
            <EllipsisHorizontalIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </div>
        {!hideText && <InteractiveEditor lite className="px-3 pb-2 text-gray-800 dark:text-gray-200 whitespace-pre-wrap" value={result.postText} onChange={(newText) => onUpdateResult({ ...result, postText: newText })} onAction={onAIAssistantAction} isLoading={isAssistantLoading} formData={formData} />}
        
        { (result.imageUrl || result.videoUrl) && (
            <div className="relative group w-full border-t border-gray-200 dark:border-gray-700">
              {result.videoUrl ? (
                  <VideoPlayer src={result.videoUrl} className="w-full h-full object-cover bg-black" />
              ) : result.imageUrl && (
                <>
                  <img src={result.imageUrl} alt="Podgląd posta" className="w-full h-full object-cover max-h-[500px]" />
                  {onEditImage && (
                     <button 
                        onClick={onEditImage} 
                        className="absolute top-2 right-2 flex items-center gap-2 bg-black/60 text-white text-xs font-semibold px-3 py-1.5 rounded-md backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    >
                        <PencilIcon className="w-4 h-4"/>
                        Edytuj
                    </button>
                  )}
                </>
              )}
            </div>
        )}

        <div className="mx-3 my-2 h-px bg-gray-200 dark:bg-gray-700" />
        <div className="p-1 px-2 flex justify-around text-gray-600 dark:text-gray-400 font-medium">
            <button className="flex-1 flex items-center justify-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"><ThumbsUpIcon className="w-5 h-5" /> Poleć</button>
            <button className="flex-1 flex items-center justify-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"><ChatBubbleIcon className="w-5 h-5" /> Komentarz</button>
            <button className="flex-1 flex items-center justify-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"><ShareIcon className="w-5 h-5" /> Udostępnij</button>
            <button className="flex-1 flex items-center justify-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"><SendIcon className="w-5 h-5" /> Wyślij</button>
        </div>
    </div>
);

const YouTubePreview: React.FC<PostPreviewProps> = ({ result, formData, onEditImage, hideText, onUpdateResult, onAIAssistantAction, isAssistantLoading }) => (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800/50 max-w-full shadow-sm text-sm font-sans">
        <div className="relative group w-full" style={{ aspectRatio: '16/9' }}>
            {result.videoUrl ? (
                <VideoPlayer src={result.videoUrl} className="w-full h-full object-cover bg-black rounded-t-lg" />
            ) : result.imageUrl ? (
                <img src={result.imageUrl} alt="Podgląd posta" className="w-full h-full object-cover rounded-t-lg" />
            ) : (
                <div className="w-full h-full bg-black rounded-t-lg flex items-center justify-center text-white">Brak wideo</div>
            )}
        </div>
        <div className="p-4">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white line-clamp-2">{result.videoTitle || formData?.topic || 'Tytuł Twojego Wideo'}</h3>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                <span>123 tys. wyświetleń</span>
                <span>&bull;</span>
                <span>2 dni temu</span>
            </div>
            <div className="flex items-center gap-3 mt-4">
                <UserCircleIcon className="w-10 h-10 text-gray-400 flex-shrink-0" />
                <div>
                    <p className="font-semibold text-gray-800 dark:text-white">Twoja Marka</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">123 tys. subskrybentów</p>
                </div>
                <button className="ml-auto px-4 py-2 text-xs font-semibold text-white bg-gray-800 dark:bg-gray-200 dark:text-black rounded-full">Subskrybuj</button>
            </div>

            <div className="flex items-center gap-2 mt-4">
                <div className="flex items-center bg-gray-100 dark:bg-gray-700/50 rounded-full">
                    <button className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-l-full hover:bg-gray-200 dark:hover:bg-gray-600/50">
                        <ThumbsUpIcon className="w-4 h-4" />
                        <span className="text-xs font-semibold">12 tys.</span>
                    </button>
                    <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
                    <button className="pl-2 pr-3 py-1.5 rounded-r-full hover:bg-gray-200 dark:hover:bg-gray-600/50">
                        <DislikeIcon className="w-4 h-4" />
                    </button>
                </div>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700/50 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600/50">
                    <ShareIcon className="w-4 h-4" />
                    <span className="text-xs font-semibold">Udostępnij</span>
                </button>
                 <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700/50 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600/50">
                    <BookmarkIcon className="w-4 h-4" />
                    <span className="text-xs font-semibold">Zapisz</span>
                </button>
            </div>
            
            {!hideText && (
                <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                    <InteractiveEditor
                        lite
                        className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap text-xs"
                        value={result.videoDescription || result.postText}
                        onChange={(newText) => onUpdateResult({ ...result, videoDescription: newText })}
                        onAction={onAIAssistantAction}
                        isLoading={isAssistantLoading}
                        formData={formData}
                    />
                </div>
            )}
        </div>
    </div>
);


export const PostPreview: React.FC<PostPreviewProps> = (props) => {
    const { result, formData } = props;

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
