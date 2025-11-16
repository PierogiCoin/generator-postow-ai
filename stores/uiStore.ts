import { create } from 'zustand';

type UIState = {
  isPricingModalOpen: boolean;
  authModal: 'login' | 'signup' | null;
  isBrandVoiceManagerOpen: boolean;
  isAnalysisModalOpen: boolean;
  isVeoKeyModalNeeded: boolean;
  isCommandPaletteOpen: boolean;

  setIsPricingModalOpen: (isOpen: boolean) => void;
  setAuthModal: (modal: 'login' | 'signup' | null) => void;
  setIsBrandVoiceManagerOpen: (isOpen: boolean) => void;
  setIsAnalysisModalOpen: (isOpen: boolean) => void;
  setIsVeoKeyModalNeeded: (isNeeded: boolean) => void;
  setIsCommandPaletteOpen: (isOpen: boolean) => void;
};

export const useUIStore = create<UIState>((set) => ({
  isPricingModalOpen: false,
  authModal: null,
  isBrandVoiceManagerOpen: false,
  isAnalysisModalOpen: false,
  isVeoKeyModalNeeded: false,
  isCommandPaletteOpen: false,

  setIsPricingModalOpen: (isOpen) => set({ isPricingModalOpen: isOpen }),
  setAuthModal: (modal) => set({ authModal: modal }),
  setIsBrandVoiceManagerOpen: (isOpen) => set({ isBrandVoiceManagerOpen: isOpen }),
  setIsAnalysisModalOpen: (isOpen) => set({ isAnalysisModalOpen: isOpen }),
  setIsVeoKeyModalNeeded: (isNeeded) => set({ isVeoKeyModalNeeded: isNeeded }),
  setIsCommandPaletteOpen: (isOpen) => set({ isCommandPaletteOpen: isOpen }),
}));