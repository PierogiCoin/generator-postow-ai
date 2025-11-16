import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Notification } from '../types';
import type { Toast } from '../hooks/useNotifications';
import { NotificationType } from '../types';

// Icons
import { BellIcon } from './icons/BellIcon';
import { XMarkIcon } from './icons/XMarkIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { ChatBubbleLeftRightIcon } from './icons/ChatBubbleLeftRightIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { CheckBadgeIcon } from './icons/CheckBadgeIcon';
import { TrashIcon } from './icons/TrashIcon';
import { TrophyIcon } from './icons/TrophyIcon';

interface NotificationSystemProps {
  notifications: Notification[];
  toasts: Toast[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClear: () => void;
  onRemoveToast: (id: string) => void;
}

const typeConfig: Record<NotificationType, { icon: React.FC<any>, color: string }> = {
    [NotificationType.Success]: { icon: CheckCircleIcon, color: 'text-green-500' },
    [NotificationType.Error]: { icon: AlertTriangleIcon, color: 'text-red-500' },
    [NotificationType.Info]: { icon: SparklesIcon, color: 'text-blue-500' },
    [NotificationType.Comment]: { icon: ChatBubbleLeftRightIcon, color: 'text-purple-500' },
    [NotificationType.Status]: { icon: CheckBadgeIcon, color: 'text-yellow-500' },
    [NotificationType.Achievement]: { icon: TrophyIcon, color: 'text-yellow-500' },
};

const ToastMessage: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
    const { t } = useTranslation();
    
    if (toast.component) {
        // FIX: Cast the element props to `any` to resolve the TypeScript error.
        // This is a common workaround when TypeScript can't infer the props of a dynamically rendered component via React.cloneElement.
        return React.cloneElement(toast.component as React.ReactElement<any>, { toast, onRemove });
    }

    const Icon = typeConfig[toast.type].icon;
    const color = typeConfig[toast.type].color;

    return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-4 flex items-start gap-4 animate-fade-in-up w-full max-w-sm">
            <Icon className={`w-6 h-6 ${color} flex-shrink-0 mt-0.5`} />
            <div className="flex-grow">
                <p className="text-sm font-semibold text-slate-800 dark:text-white">{t('notifications.toast.title')}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">{toast.message}</p>
            </div>
            <button onClick={() => onRemove(toast.id)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full">
                <XMarkIcon className="w-5 h-5" />
            </button>
        </div>
    );
};

const ToastContainer: React.FC<{ toasts: Toast[]; onRemove: (id: string) => void }> = ({ toasts, onRemove }) => {
    return (
        <div className="fixed top-20 right-4 z-[60] space-y-3">
            {toasts.map(toast => (
                <ToastMessage key={toast.id} toast={toast} onRemove={onRemove} />
            ))}
        </div>
    );
};

const NotificationItem: React.FC<{ notification: Notification; onMarkAsRead: (id: string) => void; closePanel: () => void; }> = ({ notification, onMarkAsRead, closePanel }) => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const Icon = typeConfig[notification.type].icon;
    const color = typeConfig[notification.type].color;
    
    // Relative time formatting
    const timeAgo = (timestamp: number): string => {
        const now = new Date();
        const seconds = Math.floor((now.getTime() - timestamp) / 1000);
        if (seconds < 60) return t('notifications.time.seconds', { count: seconds });
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return t('notifications.time.minutes', { count: minutes });
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return t('notifications.time.hours', { count: hours });
        return new Date(timestamp).toLocaleDateString('pl-PL');
    };

    const handleClick = () => {
        if (!notification.read) {
            onMarkAsRead(notification.id);
        }
        if (notification.link) {
            navigate(notification.link);
        }
        closePanel();
    };

    return (
        <div
            onClick={handleClick}
            className={`p-3 flex items-start gap-3 rounded-lg transition-colors ${notification.link ? 'cursor-pointer' : ''} ${!notification.read ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
        >
            {!notification.read && <div className="w-2.5 h-2.5 bg-blue-500 rounded-full flex-shrink-0 mt-1.5"></div>}
            <Icon className={`w-5 h-5 ${color} flex-shrink-0 mt-0.5 ${notification.read ? 'ml-[18px]' : ''}`} />
            <div className="flex-grow min-w-0">
                <p className="text-sm text-slate-700 dark:text-slate-300">{notification.message}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{timeAgo(notification.timestamp)}</p>
            </div>
        </div>
    );
};

export const NotificationSystem: React.FC<NotificationSystemProps> = (props) => {
    const { notifications, toasts, unreadCount, onMarkAsRead, onMarkAllAsRead, onClear, onRemoveToast } = props;
    const [isOpen, setIsOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const { t } = useTranslation();
  
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <>
            <ToastContainer toasts={toasts} onRemove={onRemoveToast} />
            <div className="relative" ref={panelRef}>
                <button
                    onClick={() => setIsOpen(p => !p)}
                    className="relative p-2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                    aria-label={t('notifications.label', { count: unreadCount })}
                >
                    <BellIcon className="w-5 h-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold ring-2 ring-white dark:ring-slate-900/80">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>
                {isOpen && (
                    <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg z-50 animate-fade-in flex flex-col max-h-[70vh]" style={{ animationDuration: '150ms' }}>
                        <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <h4 className="font-semibold text-slate-800 dark:text-white">{t('notifications.title')}</h4>
                            {notifications.length > 0 && (
                                <button onClick={onMarkAllAsRead} className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                                    {t('notifications.markAllRead')}
                                </button>
                            )}
                        </div>
                        <div className="flex-grow overflow-y-auto p-2 space-y-1">
                            {notifications.length > 0 ? (
                                notifications.map(n => <NotificationItem key={n.id} notification={n} onMarkAsRead={onMarkAsRead} closePanel={() => setIsOpen(false)} />)
                            ) : (
                                <p className="text-center text-sm text-slate-400 py-8">{t('notifications.empty')}</p>
                            )}
                        </div>
                         {notifications.length > 0 && (
                            <div className="p-2 border-t border-slate-200 dark:border-slate-700 text-center">
                                <button onClick={onClear} className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 mx-auto">
                                   <TrashIcon className="w-3 h-3"/> {t('notifications.clearAll')}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};