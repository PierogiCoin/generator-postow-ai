import { useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../stores/uiStore';
import { useGenerationStore } from '../stores/generationStore';

type ShortcutHandler = (e: KeyboardEvent) => void;

interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  handler: ShortcutHandler;
  description: string;
  scope?: 'global' | 'modal' | 'input';
}

// Check if user is typing in an input
const isTyping = (): boolean => {
  const activeElement = document.activeElement;
  if (!activeElement) return false;
  
  const tagName = activeElement.tagName.toLowerCase();
  const isEditable = activeElement.getAttribute('contenteditable') === 'true';
  const isInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select';
  
  return isInput || isEditable;
};

export const useKeyboardShortcuts = () => {
  const shortcutsRef = useRef<Shortcut[]>([]);
  const navigate = useNavigate();

  const {
    setIsCommandPaletteOpen,
    setIsPricingModalOpen,
    setAuthModal,
    setIsBrandVoiceManagerOpen,
    isCommandPaletteOpen,
    setIsAnalysisModalOpen,
  } = useUIStore();
  
  const {
    clearResult,
    result,
  } = useGenerationStore();

  // Define all shortcuts
  const shortcuts: Shortcut[] = useMemo(() => [
    // Global shortcuts
    {
      key: 'k',
      ctrl: true,
      handler: (e) => {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      },
      description: 'Otwórz Command Palette',
      scope: 'global',
    },
    {
      key: 'p',
      ctrl: true,
      handler: (e) => {
        e.preventDefault();
        setIsPricingModalOpen(true);
      },
      description: 'Otwórz cennik',
      scope: 'global',
    },
    {
      key: 'b',
      ctrl: true,
      shift: true,
      handler: (e) => {
        e.preventDefault();
        setIsBrandVoiceManagerOpen(true);
      },
      description: 'Otwórz Brand Voice Manager',
      scope: 'global',
    },
    {
      key: 'a',
      ctrl: true,
      shift: true,
      handler: (e) => {
        e.preventDefault();
        if (result) {
          setIsAnalysisModalOpen(true);
        }
      },
      description: 'Analizuj aktualny post',
      scope: 'global',
    },
    {
      key: 'Escape',
      handler: () => {
        // Close all modals
        setIsCommandPaletteOpen(false);
        setIsPricingModalOpen(false);
        setAuthModal(null);
        setIsBrandVoiceManagerOpen(false);
        setIsAnalysisModalOpen(false);
      },
      description: 'Zamknij wszystkie okna',
      scope: 'global',
    },
    {
      key: 'l',
      ctrl: true,
      handler: (e) => {
        e.preventDefault();
        setAuthModal('login');
      },
      description: 'Otwórz logowanie',
      scope: 'global',
    },
    {
      key: 'n',
      ctrl: true,
      handler: (e) => {
        e.preventDefault();
        clearResult();
        navigate('/generator');
      },
      description: 'Nowy post (Generator)',
      scope: 'global',
    },
    {
      key: 'd',
      ctrl: true,
      shift: true,
      handler: (e) => {
        e.preventDefault();
        navigate('/dashboard');
      },
      description: 'Przejdź do Dashboard',
      scope: 'global',
    },
    {
      key: 'h',
      ctrl: true,
      shift: true,
      handler: (e) => {
        e.preventDefault();
        navigate('/history');
      },
      description: 'Przejdź do Historii',
      scope: 'global',
    },
    {
      key: 's',
      ctrl: true,
      shift: true,
      handler: (e) => {
        e.preventDefault();
        navigate('/scheduled');
      },
      description: 'Przejdź do Zaplanowanych',
      scope: 'global',
    },
    {
      key: '/',
      handler: (e) => {
        if (!isTyping()) {
          e.preventDefault();
          setIsCommandPaletteOpen(true);
        }
      },
      description: 'Otwórz Command Palette (/)',
      scope: 'global',
    },
    {
      key: '?',
      shift: true,
      handler: (e) => {
        if (!isTyping()) {
          e.preventDefault();
        }
      },
      description: 'Pokaż skróty klawiszowe (? + shift)',
      scope: 'global',
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [navigate, clearResult, result, setIsCommandPaletteOpen, setIsPricingModalOpen,
      setAuthModal, setIsBrandVoiceManagerOpen, setIsAnalysisModalOpen]);

  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!e.key) return;
    const shortcut = shortcutsRef.current.find(s => {
      const keyMatch = e.key.toLowerCase() === s.key.toLowerCase() || e.key === s.key;
      const ctrlMatch = !!s.ctrl === (e.ctrlKey || e.metaKey);
      const shiftMatch = !!s.shift === e.shiftKey;
      const altMatch = !!s.alt === e.altKey;
      
      return keyMatch && ctrlMatch && shiftMatch && altMatch;
    });

    if (shortcut) {
      // Don't trigger if typing in input (unless explicitly allowed)
      if (shortcut.scope !== 'input' && isTyping()) {
        return;
      }
      
      shortcut.handler(e);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return shortcuts;
};

// Hook for individual shortcut registration
export const useShortcut = (
  key: string,
  handler: () => void,
  options: { ctrl?: boolean; shift?: boolean; alt?: boolean; preventDefault?: boolean } = {}
) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keyMatch = e.key.toLowerCase() === key.toLowerCase();
      const ctrlMatch = !!options.ctrl === (e.ctrlKey || e.metaKey);
      const shiftMatch = !!options.shift === e.shiftKey;
      const altMatch = !!options.alt === e.altKey;

      if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
        if (options.preventDefault !== false) {
          e.preventDefault();
        }
        handler();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [key, handler, options.ctrl, options.shift, options.alt, options.preventDefault]);
};

export default useKeyboardShortcuts;
