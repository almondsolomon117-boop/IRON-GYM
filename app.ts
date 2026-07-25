import { create } from 'zustand';

interface AppState {
  activeTab: string;
  language: 'en' | 'am';
  sidebarOpen: boolean;
  setActiveTab: (tab: string) => void;
  toggleLanguage: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'clients',
  language: 'en',
  sidebarOpen: false,
  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleLanguage: () => set((s) => ({ language: s.language === 'en' ? 'am' : 'en' })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
