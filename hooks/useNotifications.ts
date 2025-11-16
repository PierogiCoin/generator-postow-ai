import React, { useState, useCallback, useEffect } from 'react';
import type { Notification, NotificationType } from '../types';

const NOTIFICATIONS_STORAGE_KEY = 'appNotifications';

// This will be a Toast, which is a notification with a limited lifespan.
export type Toast = Notification & { duration?: number; component?: React.ReactNode };

export const useNotifications = () => {
    const [notifications, setNotifications] = useState<Notification[]>(() => {
        try {
            const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });
    const [toasts, setToasts] = useState<Toast[]>([]);

    useEffect(() => {
        try {
            localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
        } catch (error) {
            console.error('Failed to save notifications:', error);
        }
    }, [notifications]);

    useEffect(() => {
        if (toasts.length > 0) {
            const timer = setTimeout(() => {
                setToasts(currentToasts => currentToasts.slice(1));
            }, toasts[0].duration || 5000);
            return () => clearTimeout(timer);
        }
    }, [toasts]);

    const addNotification = useCallback((message: string, type: NotificationType, link?: string) => {
        const newNotification: Notification = {
            id: `notif-${Date.now()}`,
            type,
            message,
            timestamp: Date.now(),
            read: false,
            link,
        };
        setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep max 50 notifications
    }, []);
    
    const addToast = useCallback((message: string, type: NotificationType, duration: number = 5000, component?: React.ReactNode) => {
        const newToast: Toast = {
            id: `toast-${Date.now()}`,
            type,
            message,
            timestamp: Date.now(),
            read: false,
            duration,
            component,
        };
        setToasts(prev => [...prev, newToast]);
    }, []);

    const markAsRead = useCallback((id: string) => {
        setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    }, []);

    const markAllAsRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }, []);

    const clearNotifications = useCallback(() => {
        setNotifications([]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    return {
        notifications,
        toasts,
        unreadCount,
        addNotification,
        addToast,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        removeToast,
    };
};