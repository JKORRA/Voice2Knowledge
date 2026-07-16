import { create } from 'zustand';
import type { Message, Settings } from '../types';

interface ChatState {
  messages: Message[];
  settings: Settings;
  isConnected: boolean;
  isTranscribing: boolean;
  isGenerating: boolean;
  sessionId: string | null;
  showSettings: boolean;
  addMessage: (msg: Omit<Message, 'id'> & { id?: string }) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  setSettings: (settings: Partial<Settings>) => void;
  setConnectionStatus: (status: boolean) => void;
  setTranscribingStatus: (status: boolean) => void;
  setGeneratingStatus: (status: boolean) => void;
  setSessionId: (id: string | null) => void;
  setShowSettings: (show: boolean) => void;
  clearMessages: () => void;
  initSettings: () => Promise<void>;
}

export const useChatStore = create<ChatState>()((set) => ({
  messages: [],
  settings: {
    model: 'tiny',
    chatModel: 'qwen3.5-2b',
    device: 'auto',
    computeType: 'auto',
    beamSize: 2,
    chatProvider: 'local',
    externalModels: [],
    selectedExternalModelId: null,
    customLocalModels: [],
  },
  isConnected: false,
  isTranscribing: false,
  isGenerating: false,
  sessionId: null,
  showSettings: false,

  addMessage: (msg) => set((state) => ({
    messages: [...state.messages, { ...msg, id: msg.id || Math.random().toString(36).substring(7) }]
  })),

  updateMessage: (id, updates) => set((state) => ({
    messages: state.messages.map((m) => m.id === id ? { ...m, ...updates } : m)
  })),

  setSettings: (newSettings) => {
    set((state) => {
      const updatedSettings = { ...state.settings, ...newSettings };
      // Async sync to backend
      const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? window.location.host 
        : '127.0.0.1:8000';
      fetch(`http://${host}/api/user-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      }).catch(err => console.error('Failed to sync settings to backend', err));
      
      return { settings: updatedSettings };
    });
  },

  setConnectionStatus: (status) => set({ isConnected: status }),
  setTranscribingStatus: (status) => set({ isTranscribing: status }),
  setGeneratingStatus: (status) => set({ isGenerating: status }),
  setSessionId: (id) => set({ sessionId: id }),
  setShowSettings: (show) => set({ showSettings: show }),
  clearMessages: () => set({ messages: [] }),

  initSettings: async () => {
    const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
      ? window.location.host 
      : '127.0.0.1:8000';
    try {
      const res = await fetch(`http://${host}/api/user-settings`);
      if (res.ok) {
        const data = await res.json();
        if (Object.keys(data).length > 0) {
          set((state) => ({ settings: { ...state.settings, ...data } }));
        }
      }
    } catch (err) {
      console.error('Failed to load settings from backend', err);
    }
  }
}));
