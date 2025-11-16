import React, { useState, useEffect } from 'react';
import type { ScheduledPost, CampaignHistoryItem, Draft } from '../types';
import { SortKey, SortDirection } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { ArrowUpIcon } from './icons/ArrowUpIcon';
import { ImageIcon } from './icons/ImageIcon';
import { VideoIcon } from './icons/VideoIcon';
import { PostIcon } from './icons/PostIcon';
import { PencilIcon } from './icons/PencilIcon';

interface ScheduledPostsListProps {
  scheduledPosts: ScheduledPost[];
  onDelete: (id: string) => void;
  onEdit: (post: ScheduledPost) => void;
  onClear: () => void;
  onHover: (e: React.MouseEvent<HTMLDivElement>, item: ScheduledPost) => void;
  onLeave: () => void;
}

const getPostType = (post: ScheduledPost) => {
    if (post.result.videoUrl) return 'video';
    if (post.result.imageUrl) return 'image';
    return 'post';
};

const PostTypeIcon: React.FC<{type: 'post' | 'image' | 'video'}> = ({ type }) => {
    const iconContainerClass = "w-8 h-8 rounded-full flex items-center justify-center mr-4 flex-shrink-0";
    const iconClass = "w-4 h-4";

    switch (type) {
        case 'video':
            return <div className={`${iconContainerClass} bg-red-100 dark:bg-red-900/50`} title="Wideo"><VideoIcon className={`${iconClass} text-red-600 dark:text-red-400`} /></div>;
        case 'image':
            return <div className={`${iconContainerClass} bg-blue-100 dark:bg-blue-900/50`} title="Obraz"><ImageIcon className={`${iconClass} text-blue-600 dark:text-blue-400`} /></div>;
        case 'post':
        default:
            return <div className={`${iconContainerClass} bg-slate-200 dark:bg-slate-700`} title="Post"><PostIcon className={`${iconClass} text-slate-600 dark:text-slate-300`} /></div>;
    }
};

const calculateTimeProgress = (createdAt: number, scheduleTimestamp: number, now: number) => {
    if (now >= scheduleTimestamp) {
        return {
            progress: 100,
            remainingText: 'Czas na publikację!',
            isComplete: true,
        };
    }

    const totalDuration = scheduleTimestamp - createdAt;
    const elapsedTime = now - createdAt;

    if (totalDuration <= 0 || elapsedTime < 0) {
        return {
            progress: 0,
            remainingText: 'Oczekuje',
            isComplete: false,
        };
    }

    const progress = Math.min(100, (elapsedTime / totalDuration) * 100);

    const remainingMillis = scheduleTimestamp - now;
    const remainingSeconds = Math.floor(remainingMillis / 1000);
    const remainingMinutes = Math.floor(remainingSeconds / 60);
    const remainingHours = Math.floor(remainingMinutes / 60);
    const remainingDays = Math.floor(remainingHours / 24);

    let remainingText = '';
    if (remainingDays > 1) {
        remainingText = `za ${remainingDays} dni`;
    } else if (remainingDays === 1) {
        remainingText = `jutro`;
    } else if (remainingHours > 0) {
        remainingText = `za ${remainingHours} godz.`;
    } else if (remainingMinutes > 0) {
        remainingText = `za ${remainingMinutes} min.`;
    } else {
        remainingText = `za chwilę`;
    }

    return {
        progress,
        remainingText,
        isComplete: false,
    };
};


export const ScheduledPostsList: React.FC<ScheduledPostsListProps> = ({ scheduledPosts, onDelete, onEdit, onClear, onHover, onLeave }) => {
  const [sortKey, setSortKey] = useState<SortKey>(SortKey.Date);
  const [sortDirection, setSortDirection] = useState<SortDirection>(SortDirection.Asc);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 10000); // Update every 10 seconds

    return () => clearInterval(timer);
  }, []);

  const handleDelete = (id: string, topic: string) => {
    if (window.confirm(`Czy na pewno chcesz usunąć zaplanowany post dla "${topic}"?`)) {
      onDelete(id);
    }
  };

  const sortedPosts = [...scheduledPosts].sort((a, b) => {
    let comparison = 0;
    if (sortKey === SortKey.Topic) {
      comparison = a.formData.topic.localeCompare(b.formData.topic, 'pl', { sensitivity: 'base' });
    } else {
      comparison = a.scheduleTimestamp - b.scheduleTimestamp;
    }
    return sortDirection === SortDirection.Asc ? comparison : -comparison;
  });

  return (
    <section>
      <div className="flex justify-between items-center mb-4 gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Zaplanowane</h2>
        </div>
        {scheduledPosts.length > 0 && (
          <button
            onClick={onClear}
            className="text-sm text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors flex-shrink-0"
          >
            Wyczyść wszystko
          </button>
        )}
      </div>
      
      {scheduledPosts.length > 1 && (
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-700 dark:text-slate-300">
            <button
              onClick={() => setSortKey(SortKey.Date)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${sortKey === SortKey.Date ? 'bg-blue-600 text-white font-semibold' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}
              aria-pressed={sortKey === SortKey.Date}
            >
              Data
            </button>
            <button
              onClick={() => setSortKey(SortKey.Topic)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${sortKey === SortKey.Topic ? 'bg-blue-600 text-white font-semibold' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}
              aria-pressed={sortKey === SortKey.Topic}
            >
              Temat
            </button>
          </div>
          <button
            onClick={() => setSortDirection(prev => prev === SortDirection.Asc ? SortDirection.Desc : SortDirection.Asc)}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="Zmień kierunek sortowania"
            title={`Sortuj ${sortDirection === SortDirection.Asc ? 'malejąco' : 'rosnąco'}`}
          >
            <ArrowUpIcon className={`w-4 h-4 transition-transform duration-200 ${sortDirection === SortDirection.Desc ? 'rotate-180' : ''}`} />
          </button>
        </div>
      )}

      {sortedPosts.length === 0 && (
         <p className="text-sm text-slate-500 dark:text-slate-400">Twoje zaplanowane posty pojawią się tutaj.</p>
      )}

      {sortedPosts.length > 0 && (
        <div className="space-y-3 max-h-60 overflow-y-auto pr-2 -mr-2">
          {sortedPosts
            .map((post) => {
              const postType = getPostType(post);
              const { progress, remainingText, isComplete } = calculateTimeProgress(post.createdAt, post.scheduleTimestamp, now);
              
              return (
              <div
                key={post.id}
                onMouseEnter={(e) => onHover(e, post)}
                onMouseLeave={onLeave}
                className="p-3 rounded-lg bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 flex justify-between items-center"
              >
                <div className="flex items-start flex-grow min-w-0 pr-4">
                   <PostTypeIcon type={postType} />
                  <div className="flex-grow min-w-0">
                    <p className="font-semibold text-sm text-slate-900 dark:text-white truncate" title={post.formData.topic}>{post.formData.topic}</p>
                     <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                        <span>
                            {new Date(post.scheduleTimestamp).toLocaleString('pl-PL', {
                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                        </span>
                        <span className={`font-semibold ${isComplete ? 'text-green-500 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}>
                            {remainingText}
                        </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700/50 rounded-full h-1 mt-2 overflow-hidden">
                        <div 
                            className={`h-full rounded-full transition-all duration-500 ease-linear ${isComplete ? 'bg-green-500' : 'bg-blue-500'}`}
                            style={{ width: `${progress}%` }}
                            role="progressbar"
                            aria-valuenow={progress}
                            aria-valuemin={0}
                            aria-valuemax={100}
                        ></div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center flex-shrink-0">
                  <button
                    onClick={() => onEdit(post)}
                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    aria-label="Edytuj post"
                    title="Edytuj"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(post.id, post.formData.topic)}
                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    aria-label="Usuń zaplanowany post"
                    title="Usuń"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )})}
        </div>
      )}
    </section>
  );
};
