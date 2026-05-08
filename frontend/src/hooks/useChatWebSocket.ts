import { useEffect, useRef, useCallback } from 'react';
import { useChatStore } from '../stores/chatStore';

export const useChatWebSocket = (sessionId: string | null) => {
  const ws = useRef<WebSocket | null>(null);
  const currentMessageId = useRef<string | null>(null);
  const { 
    setGeneratingStatus,
    addMessage
  } = useChatStore();

  const connect = useCallback(() => {
    if (!sessionId) return;

    const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
      ? window.location.host 
      : '127.0.0.1:8000';

    const wsUrl = `ws://${host}/ws/chat/${sessionId}`;
    
    ws.current = new WebSocket(wsUrl);

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'status':
            // Initiating response
            currentMessageId.current = Math.random().toString(36).substring(7);
            addMessage({
              id: currentMessageId.current,
              role: 'assistant',
              type: 'text',
              content: '',
            });
            break;

          case 'token':
            if (currentMessageId.current) {
              useChatStore.setState(state => {
                const msg = state.messages.find(m => m.id === currentMessageId.current);
                if (msg) {
                  return {
                    messages: state.messages.map(m => 
                      m.id === currentMessageId.current ? { ...m, content: m.content + data.content } : m
                    )
                  };
                }
                return state;
              });
            }
            break;

          case 'done':
            setGeneratingStatus(false);
            currentMessageId.current = null;
            break;

          case 'error':
            setGeneratingStatus(false);
            currentMessageId.current = null;
            if (data.message === "System is currently transcribing. Please wait.") return;
            addMessage({
              role: 'assistant',
              type: 'error',
              content: data.message || "An error occurred during generation."
            });
            break;
        }
      } catch (err) {
        console.error('Failed to parse Chat WebSocket message:', err);
      }
    };

    ws.current.onclose = () => {
      setGeneratingStatus(false);
    };

  }, [sessionId, addMessage, setGeneratingStatus]);

  useEffect(() => {
    connect();
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  const sendQuestion = useCallback((question: string) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      connect();
    }
    
    // Give it a tiny bit of time to connect if it was closed
    setTimeout(() => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            const { selectedContextFiles, settings } = useChatStore.getState();
            setGeneratingStatus(true);
            ws.current.send(JSON.stringify({ 
              question,
              selected_files: selectedContextFiles,
              chat_model: settings.chatModel
            }));
        } else {
            addMessage({
                role: 'assistant',
                type: 'error',
                content: "Cannot connect to chat server."
            });
        }
    }, 100);

  }, [connect, setGeneratingStatus, addMessage]);

  const cancelGeneration = useCallback(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ action: 'stop' }));
      setGeneratingStatus(false);
    }
  }, [setGeneratingStatus]);

  return { sendQuestion, cancelGeneration };
};
