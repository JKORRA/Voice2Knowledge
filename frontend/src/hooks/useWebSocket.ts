import { useEffect, useRef, useCallback } from 'react';
import { useChatStore } from '../stores/chatStore';

export const useWebSocket = (sessionId: string | null) => {
  const ws = useRef<WebSocket | null>(null);
  const { 
    setConnectionStatus, 
    setTranscribingStatus,
    settings 
  } = useChatStore();

  useEffect(() => {
    if (!sessionId) return;

    // Use current host, but specifically check for desktop app
    const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
      ? window.location.host 
      : '127.0.0.1:8000'; // Default fallback

    const wsUrl = `ws://${host}/ws/transcribe/${sessionId}`;
    
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      setConnectionStatus(true);
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'progress':
            // Check if we already have a progress message for this file
            useChatStore.setState(state => {
              const existingMsg = state.messages.find(m => m.file === data.file && m.type === 'progress');
              if (existingMsg) {
                // Update existing
                return {
                  messages: state.messages.map(m => 
                    m.id === existingMsg.id ? { ...m, percent: data.percent, content: data.partial || m.content } : m
                  )
                };
              } else {
                // Create new
                return {
                  messages: [...state.messages, {
                    id: Math.random().toString(36).substring(7),
                    role: 'assistant',
                    type: 'progress' as const,
                    content: data.message || 'Transcribing...',
                    file: data.file,
                    percent: data.percent,
                    isStreaming: true
                  }]
                };
              }
            });
            break;

          case 'result':
            useChatStore.setState(state => {
              // Convert progress to result
              const messages = state.messages.map(m => {
                if (m.file === data.file && m.type === 'progress') {
                  return {
                    ...m,
                    type: 'result' as const,
                    content: data.text,
                    isStreaming: false,
                    txtPath: data.txt_path
                  };
                }
                return m;
              });
              return { messages, isTranscribing: false };
            });
            break;

          case 'error':
            useChatStore.setState(state => {
              const messages = state.messages.map(m => {
                if (m.file === data.file && m.type === 'progress') {
                  return {
                    ...m,
                    type: 'error' as const,
                    content: `Error: ${data.message}`,
                    isStreaming: false
                  };
                }
                return m;
              });
              // If no file context, just add error
              if (!data.file) {
                messages.push({
                  id: Math.random().toString(36).substring(7),
                  role: 'assistant',
                  type: 'error' as const,
                  content: `Error: ${data.message}`
                });
              }
              return { messages, isTranscribing: false };
            });
            break;

          case 'cancelled':
            useChatStore.setState(state => {
              const messages = state.messages.map(m => {
                if (m.file === data.file && m.type === 'progress') {
                  return {
                    ...m,
                    type: 'cancelled' as const,
                    content: 'Transcription cancelled.',
                    isStreaming: false
                  };
                }
                return m;
              });
              return { messages, isTranscribing: false };
            });
            break;
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.current.onclose = () => {
      setConnectionStatus(false);
      setTranscribingStatus(false);
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [sessionId, setConnectionStatus, setTranscribingStatus]);

  const sendFiles = useCallback((files: string[]) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        files,
        ...settings
      }));
      setTranscribingStatus(true);
    }
  }, [settings, setTranscribingStatus]);

  const cancelTranscription = useCallback(async () => {
    if (sessionId) {
      try {
        const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
          ? window.location.host 
          : '127.0.0.1:8000';
        await fetch(`http://${host}/api/cancel/${sessionId}`, { method: 'POST' });
      } catch (err) {
        console.error('Failed to cancel:', err);
      }
    }
  }, [sessionId]);

  return { sendFiles, cancelTranscription };
};
