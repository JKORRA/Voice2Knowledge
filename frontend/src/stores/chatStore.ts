import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: [],
      settings: {
        model: 'small',
        chatModel: 'qwen2.5-3b',
        device: 'auto',
        computeType: 'auto',
        beamSize: 2,
        chatProvider: 'local',
        externalModels: [],
        selectedExternalModelId: null,
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

      setSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),

      setConnectionStatus: (status) => set({ isConnected: status }),
      setTranscribingStatus: (status) => set({ isTranscribing: status }),
      setGeneratingStatus: (status) => set({ isGenerating: status }),
      setSessionId: (id) => set({ sessionId: id }),
      setShowSettings: (show) => set({ showSettings: show }),
      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: 'voice2knowledge-chat-storage',
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);
