import { useState, useCallback, useEffect } from 'react';
import type { CampaignHistoryItem, AppError, NewCampaignPayload, FavoritePost, User, PostApprovalStatus, Comment, FormData, NotificationType } from '../types';
import type { ConfirmFn } from './appHandlers/types';

const HISTORY_STORAGE_KEY = 'generationHistory';

// Pomocnicza funkcja do wczytywania historii z localStorage
const loadHistoryFromStorage = (): CampaignHistoryItem[] => {
  try {
    const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
    return storedHistory ? JSON.parse(storedHistory) : [];
  } catch {
    return [];
  }
};

// Pomocnicza funkcja do zapisywania historii w localStorage
const saveHistoryToStorage = (history: CampaignHistoryItem[]) => {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch {
    // storage full or unavailable
  }
};

const statusLabels: Record<PostApprovalStatus, string> = {
  draft: 'Szkic',
  pending_approval: 'Oczekuje na akceptację',
  approved: 'Zatwierdzony',
  rejected: 'Wymaga poprawek',
};

// Fix: Corrected hook signature and return values to match App.tsx
export const useGenerationHistory = (
  user: User | null,
  clearStatsService: () => void,
  addNotification: (message: string, type: NotificationType, link?: string) => void,
  confirm?: ConfirmFn,
) => {
  const [history, setHistory] = useState<CampaignHistoryItem[]>(loadHistoryFromStorage);
  const [inspiration, setInspiration] = useState<CampaignHistoryItem | FavoritePost | null>(null);

  // Ten efekt będzie teraz odpowiedzialny za utrwalanie zmian w localStorage
  useEffect(() => {
    saveHistoryToStorage(history);
  }, [history]);

  const addGenerationToHistory = useCallback(async (payload: NewCampaignPayload, teamId: string | null, author: User) => {
    const newHistoryItem: CampaignHistoryItem = {
      formData: payload.formData,
      result: payload.result,
      sentimentAnalysis: payload.sentimentAnalysis,
      seoAnalysis: payload.seoAnalysis,
      id: new Date().toISOString() + Math.random(),
      timestamp: Date.now(),
      teamId: teamId,
      authorId: author.id,
      authorName: author.name,
      status: 'draft',
      comments: [],
    };
    setHistory(prev => [newHistoryItem, ...prev]);
  }, []);

  const selectInspiration = useCallback((item: CampaignHistoryItem | FavoritePost | null) => {
    setInspiration(current => (current?.id === item?.id ? null : item));
  }, []);

  const handleClearHistory = useCallback(async () => {
    const message = 'Czy na pewno chcesz usunąć całą historię kampanii? Tej operacji nie można cofnąć. Spowoduje to również zresetowanie statystyk użycia.';
    const confirmed = confirm
      ? await confirm({ message, variant: 'danger', confirmLabel: 'Usuń historię', title: 'Wyczyść historię' })
      : window.confirm(message);
    if (!confirmed) return;

    setHistory([]);
    setInspiration(null);
    clearStatsService();
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch {
      // storage unavailable
    }
  }, [clearStatsService, confirm]);

  // Fix: Implemented missing functions
  const handleStatusChange = useCallback((itemId: string, status: PostApprovalStatus) => {
    setHistory(prev => prev.map(item => {
      if (item.id === itemId) {
        addNotification(`Status posta "${(item.formData?.topic || "").substring(0, 20).replace(/<[^>]*>?/gm, '')}..." zmieniono na "${statusLabels[status]}".`, 'status' as NotificationType, '/generator');
        return { ...item, status };
      }
      return item;
    }));
  }, [addNotification]);

  const onAddComment = useCallback((itemId: string, text: string) => {
    if (!user) return;
    setHistory(prev => prev.map(item => {
      if (item.id === itemId) {
        const newComment: Comment = {
          id: `comment-${Date.now()}`,
          authorId: user.id,
          authorName: user.name,
          text,
          timestamp: Date.now(),
        };
        addNotification(`Nowy komentarz od ${user.name} w poście "${(item.formData?.topic || "").substring(0, 20).replace(/<[^>]*>?/gm, '')}...".`, 'comment' as NotificationType, '/generator');
        return { ...item, comments: [...item.comments, newComment] };
      }
      return item;
    }));
  }, [user, addNotification]);

  const handleSaveDraft = useCallback((formData: FormData) => {
    // This is a mock implementation. A real one would likely save to a backend.
    // Could potentially add a draft to history with a specific status
  }, []);

  return {
    history,
    inspiration,
    setHistory,
    addGenerationToHistory,
    selectInspiration,
    handleClearHistory,
    // Fix: Exporting implemented functions
    handleStatusChange,
    onAddComment,
    handleSaveDraft,
  };
};