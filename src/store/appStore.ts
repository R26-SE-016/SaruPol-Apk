import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { changeLanguage as i18nChangeLang } from '../utils/i18n';

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface PredictionHistoryItem {
  id: string;
  type: 'yield' | 'pathology' | 'soil';
  date: string;
  input: any;
  result: any;
  synced: boolean;
}

interface AppState {
  token: string | null;
  user: User | null;
  isGuest: boolean;
  history: PredictionHistoryItem[];
  isConnected: boolean;
  language: 'en' | 'si';
  
  // Setters
  setConnectionStatus: (connected: boolean) => void;
  setLanguage: (lang: 'en' | 'si') => Promise<void>;
  
  // Auth Actions
  loginUser: (token: string, user: User) => Promise<void>;
  logoutUser: () => Promise<void>;
  setGuestMode: (isGuest: boolean) => void;
  
  // History Actions
  addHistoryItem: (item: Omit<PredictionHistoryItem, 'id' | 'date' | 'synced'>) => Promise<void>;
  clearHistory: () => Promise<void>;
  loadPersistedData: () => Promise<void>;
  syncPendingHistory: (apiClient: any) => Promise<void>;
}

const STORAGE_KEYS = {
  TOKEN: 'sarupol_token',
  USER: 'sarupol_user',
  HISTORY: 'sarupol_history',
  LANG: 'sarupol_user_lang',
  GUEST: 'sarupol_guest'
};

export const useAppStore = create<AppState>((set, get) => ({
  token: null,
  user: null,
  isGuest: true,
  history: [],
  isConnected: true,
  language: 'en',

  setConnectionStatus: (connected) => set({ isConnected: connected }),

  setLanguage: async (lang) => {
    await i18nChangeLang(lang);
    set({ language: lang });
  },

  loginUser: async (token, user) => {
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    await AsyncStorage.setItem(STORAGE_KEYS.GUEST, 'false');
    set({ token, user, isGuest: false });
  },

  logoutUser: async () => {
    await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.USER);
    await AsyncStorage.setItem(STORAGE_KEYS.GUEST, 'true');
    set({ token: null, user: null, isGuest: true });
  },

  setGuestMode: (isGuest) => {
    AsyncStorage.setItem(STORAGE_KEYS.GUEST, isGuest ? 'true' : 'false');
    set({ isGuest });
  },

  addHistoryItem: async (item) => {
    const newItem: PredictionHistoryItem = {
      ...item,
      id: Math.random().toString(36).substring(2, 9),
      date: new Date().toISOString(),
      synced: get().isConnected && !get().isGuest
    };

    const updatedHistory = [newItem, ...get().history];
    await AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updatedHistory));
    set({ history: updatedHistory });
  },

  clearHistory: async () => {
    await AsyncStorage.removeItem(STORAGE_KEYS.HISTORY);
    set({ history: [] });
  },

  loadPersistedData: async () => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      const userStr = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      const guestStr = await AsyncStorage.getItem(STORAGE_KEYS.GUEST);
      const historyStr = await AsyncStorage.getItem(STORAGE_KEYS.HISTORY);
      const langStr = await AsyncStorage.getItem(STORAGE_KEYS.LANG);

      const user = userStr ? JSON.parse(userStr) : null;
      const isGuest = guestStr === 'false' ? false : true;
      const history = historyStr ? JSON.parse(historyStr) : [];
      const language = (langStr as 'en' | 'si') || 'en';

      set({
        token: isGuest ? null : token,
        user: isGuest ? null : user,
        isGuest,
        history,
        language
      });
    } catch (err) {
      console.error('Error loading persisted store data:', err);
    }
  },

  syncPendingHistory: async (apiClient) => {
    const { history, isConnected, token, isGuest } = get();
    if (!isConnected || isGuest || !token) return;

    const unsynced = history.filter(h => !h.synced);
    if (unsynced.length === 0) return;

    console.log(`Syncing ${unsynced.length} unsynced items to gateway...`);
    
    let updatedHistory = [...history];
    for (const item of unsynced) {
      try {
        // Send to API gateway endpoint for history backup
        await apiClient.post('/auth/sync-log', {
          feature: item.type,
          payload: JSON.stringify({ input: item.input, result: item.result })
        });
        
        // Mark as synced
        updatedHistory = updatedHistory.map(h => 
          h.id === item.id ? { ...h, synced: true } : h
        );
      } catch (err) {
        console.warn(`Failed to sync item ${item.id}:`, err);
      }
    }

    await AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updatedHistory));
    set({ history: updatedHistory });
  }
}));
