import React, { useState, useRef, useEffect } from 'react';
import type { CampaignHistoryItem, User, TeamMemberRole, PostApprovalStatus } from '../types';
import { ClockIcon } from './icons/ClockIcon';
import { CheckBadgeIcon } from './icons/CheckBadgeIcon';
import { NoSymbolIcon } from './icons/NoSymbolIcon';
import { PencilIcon } from './icons/PencilIcon';
import { ChatBubbleLeftRightIcon } from './icons/ChatBubbleLeftRightIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { SendIcon } from './icons/SendIcon';
import { CalendarIcon } from './icons/CalendarIcon';

interface CollaborationProps {
  item: CampaignHistoryItem;
  user: User;
  role: TeamMemberRole | null;
  onStatusChange: (itemId: string, status: PostApprovalStatus) => void;
  onAddComment: (itemId: string, text: string) => void;
  onSetDueDate: (itemId: string, dueDate: number | null) => void;
}

const statusConfig: Record<PostApprovalStatus, { label: string; icon: React.FC<any>; color: string }> = {
  draft: { label: 'Szkic', icon: PencilIcon, color: 'text-gray-500 dark:text-gray-400' },
  pending_approval: { label: 'Oczekuje na akceptację', icon: ClockIcon, color: 'text-yellow-500 dark:text-yellow-400' },
  approved: { label: 'Zatwierdzony', icon: CheckBadgeIcon, color: 'text-green-500 dark:text-green-400' },
  rejected: { label: 'Wymaga poprawek', icon: NoSymbolIcon, color: 'text-red-500 dark:text-red-400' },
};

export const Collaboration: React.FC<CollaborationProps> = ({ item, user, role, onStatusChange, onAddComment, onSetDueDate }) => {
  const [newComment, setNewComment] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const StatusIcon = statusConfig[item.status].icon;

  const [isEditingDate, setIsEditingDate] = useState(false);
  const [newDueDate, setNewDueDate] = useState('');

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [item.comments]);

  const handleAddComment = () => {
    if (newComment.trim()) {
      onAddComment(item.id, newComment.trim());
      setNewComment('');
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleAddComment();
    }
  };

  const canRequestApproval = role === 'member' && (item.status === 'draft' || item.status === 'rejected');
  const canApproveOrReject = role === 'manager' && item.status === 'pending_approval';
  const canEditDate = role === 'manager' || (role === 'member' && (item.status === 'draft' || item.status === 'rejected'));

  const handleDateEditToggle = () => {
    if (item.dueDate) {
      const d = new Date(item.dueDate);
      const dateString = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
      setNewDueDate(dateString);
    } else {
      const today = new Date();
      today.setDate(today.getDate() + 1); // Default to tomorrow
      const dateString = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
      setNewDueDate(dateString);
    }
    setIsEditingDate(prev => !prev);
  };

  const handleSaveDate = () => {
    if (newDueDate) {
        const [year, month, day] = newDueDate.split('-').map(Number);
        const date = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
        onSetDueDate(item.id, date.getTime());
    } else {
        onSetDueDate(item.id, null);
    }
    setIsEditingDate(false);
  };
  
  const isOverdue = item.dueDate && item.dueDate < Date.now() && item.status !== 'approved';

  return (
    <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg space-y-6">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Współpraca</h3>
      
      {/* Status & Actions */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 w-16">Status:</p>
                <div className={`flex items-center gap-2 font-semibold ${statusConfig[item.status].color}`}>
                    <StatusIcon className="w-5 h-5" />
                    <span>{statusConfig[item.status].label}</span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {canRequestApproval && (
                    <button onClick={() => onStatusChange(item.id, 'pending_approval')} className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition">
                        Wyślij do akceptacji
                    </button>
                )}
                {canApproveOrReject && (
                    <>
                        <button onClick={() => onStatusChange(item.id, 'rejected')} className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-200 dark:bg-red-900/50 dark:text-red-300 rounded-md hover:bg-red-300 dark:hover:bg-red-800 transition">
                            Odrzuć
                        </button>
                        <button onClick={() => onStatusChange(item.id, 'approved')} className="px-3 py-1.5 text-xs font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 transition">
                            Zatwierdź
                        </button>
                    </>
                )}
            </div>
        </div>
        <div className="flex justify-between items-center min-h-[34px]">
            <div className="flex items-center gap-3">
                 <p className="text-sm font-medium text-slate-500 dark:text-slate-400 w-16">Termin:</p>
                {isEditingDate ? (
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={newDueDate}
                            onChange={(e) => setNewDueDate(e.target.value)}
                            className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md p-1 text-sm focus:ring-1 focus:ring-blue-500"
                        />
                        <button onClick={handleSaveDate} className="px-2 py-1 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700">Zapisz</button>
                        <button onClick={() => setIsEditingDate(false)} className="px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600">Anuluj</button>
                    </div>
                ) : item.dueDate ? (
                    <div className={`flex items-center gap-2 font-semibold text-sm ${isOverdue ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                        <CalendarIcon className="w-4 h-4" />
                        <span>{isOverdue && 'Po terminie: '}{new Date(item.dueDate).toLocaleDateString('pl-PL')}</span>
                    </div>
                ) : (
                    <span className="text-sm text-slate-400 italic">Nie ustawiono</span>
                )}
            </div>
             {canEditDate && !isEditingDate && (
                 <button onClick={handleDateEditToggle} className="p-1.5 text-slate-500 hover:text-blue-500 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title={item.dueDate ? 'Zmień termin' : 'Ustaw termin'}>
                    <PencilIcon className="w-4 h-4"/>
                 </button>
            )}
        </div>
      </div>

      {/* Live Chat */}
      <div>
        <h4 className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-3">
            <ChatBubbleLeftRightIcon className="w-5 h-5"/>
            Czat Zespołu
        </h4>
        <div className="space-y-4">
             <div ref={chatContainerRef} className="max-h-72 overflow-y-auto pr-2 space-y-4 flex flex-col p-2">
                 {item.comments.length > 0 ? (
                    item.comments.map(comment => {
                        const isCurrentUser = comment.authorId === user.id;
                        return (
                            <div key={comment.id} className={`flex items-end gap-2.5 ${isCurrentUser ? 'justify-end' : ''}`}>
                                {!isCurrentUser && <UserCircleIcon className="w-8 h-8 text-slate-400 flex-shrink-0" />}
                                <div className={`flex flex-col gap-1 w-full max-w-xs ${isCurrentUser ? 'items-end' : ''}`}>
                                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                        <span className="text-xs font-semibold text-gray-900 dark:text-white">{comment.authorName}</span>
                                        <span className="text-xs font-normal text-gray-500 dark:text-gray-400">{new Date(comment.timestamp).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div className={`leading-1.5 p-3 border-gray-200 ${isCurrentUser ? 'bg-blue-600 text-white rounded-s-xl rounded-ee-xl' : 'bg-gray-100 dark:bg-gray-700 rounded-e-xl rounded-es-xl'}`}>
                                        <p className="text-sm font-normal">{comment.text}</p>
                                    </div>
                                </div>
                                {isCurrentUser && <UserCircleIcon className="w-8 h-8 text-slate-400 flex-shrink-0" />}
                            </div>
                        )
                    })
                ) : (
                    <p className="text-center text-sm text-slate-400 py-4">Brak wiadomości. Rozpocznij dyskusję!</p>
                )}
            </div>
            <div className="flex items-start gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <UserCircleIcon className="w-8 h-8 text-slate-400 flex-shrink-0 mt-1" />
                <div className="flex-grow relative">
                     <textarea 
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Napisz wiadomość..."
                        rows={1}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 pr-12 text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                     />
                     <button 
                        onClick={handleAddComment}
                        disabled={!newComment.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white bg-blue-600 rounded-full hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Wyślij wiadomość"
                     >
                        <SendIcon className="w-4 h-4" />
                     </button>
                </div>
             </div>
        </div>
      </div>
    </div>
  );
};