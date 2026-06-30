import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Notification, NotificationType } from '../types';

const NOTIFICATIONS_STORAGE_KEY = 'appNotifications';

export type Toast = Notification & {
  duration?: number;
  component?: React.ReactNode;
  title?: string;
  action?: string;
};

export type NotificationsContextValue = {
  notifications: Notification[];
  toasts: Toast[];
  unreadCount: number;
  addNotification: (message: string, type: NotificationType, link?: string) => void;
  addToast: (
    message: string,
    type: NotificationType,
    duration?: number,
    extras?: { title?: string; action?: string }
  ) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  removeToast: (id: string) => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
    } catch {
      // storage full or unavailable
    }
  }, [notifications]);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts((current) => current.slice(1));
    }, toasts[0].duration || 5000);
    return () => clearTimeout(timer);
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
    setNotifications((prev) => [newNotification, ...prev].slice(0, 50));
  }, []);

  const addToast = useCallback((
    message: string,
    type: NotificationType,
    duration: number = 5000,
    extras?: { title?: string; action?: string }
  ) => {
    const newToast: Toast = {
      id: `toast-${Date.now()}`,
      type,
      message,
      timestamp: Date.now(),
      read: false,
      duration,
      title: extras?.title,
      action: extras?.action,
    };
    setToasts((prev) => [...prev, newToast]);
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const value = useMemo<NotificationsContextValue>(
    () => ({
      notifications,
      toasts,
      unreadCount,
      addNotification,
      addToast,
      markAsRead,
      markAllAsRead,
      clearNotifications,
      removeToast,
    }),
    [
      notifications,
      toasts,
      unreadCount,
      addNotification,
      addToast,
      markAsRead,
      markAllAsRead,
      clearNotifications,
      removeToast,
    ]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return ctx;
}
