import React, { useState, useRef, useEffect } from 'react';
import { Upload, SquareSquare, Loader2, PanelLeft } from 'lucide-react';
import { useChatStore } from './stores/chatStore';
import { useWebSocket } from './hooks/useWebSocket';
import { useChatWebSocket } from './hooks/useChatWebSocket';
import { useTheme } from './hooks/useTheme';
import { SettingsScreen } from './components/SettingsScreen';
import { Sidebar } from './components/Sidebar';
import { EmptyState } from './components/EmptyState';
import { ChatMessage } from './components/ChatMessage';
import { ProgressMessage } from './components/ProgressMessage';
import { ResultMessage } from './components/ResultMessage';
import { ChatInput } from './components/ChatInput';
import { SetupScreen } from './components/SetupScreen';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './lib/utils';

export default function App() {
  const {
    messages,
    settings,
    setSettings,
    isTranscribing,
    sessionId,
    setSessionId,
    showSettings,
    setShowSettings,
    addMessage,
    isGenerating,
    initSettings
  } = useChatStore();

  const { sendFiles, cancelTranscription } = useWebSocket(sessionId);
  const { sendQuestion, cancelGeneration } = useChatWebSocket(sessionId);
  const { resolvedTheme, toggleTheme } = useTheme();

  const [isUploading, setIsUploading] = useState(false);
  const [showChatInput, setShowChatInput] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [queuedPrompt, setQueuedPrompt] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<{ paths: string[], names: string[] } | null>(null);
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const uploadAbortController = useRef<AbortController | null>(null);

  const cancelUpload = () => {
    if (uploadAbortController.current) {
      uploadAbortController.current.abort();
      uploadAbortController.current = null;
    }
    setPendingFiles(null);
    setIsUploading(false);
    if (messages.length === 0) {
      setShowChatInput(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? window.location.host
    : '127.0.0.1:8000';

  useEffect(() => {
    initSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetch(`http://${host}/api/setup/status`)
      .then(res => res.json())
      .then(data => {
        setNeedsSetup(!data.is_ready);
      })
      .catch(err => {
        console.error("Setup status check failed", err);
        setNeedsSetup(false); // Fallback
      });
  }, [host]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // If transcription just finished, we have a queued prompt, and at least one successful result
    if (!isTranscribing && queuedPrompt && messages.some(m => m.type === 'result')) {
      sendQuestion(queuedPrompt);
      setQueuedPrompt(null);
    }
  }, [isTranscribing, queuedPrompt, messages, sendQuestion]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setShowChatInput(true);
    setPendingFiles({
      paths: [],
      names: Array.from(files).map(f => f.name)
    });

    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append('files', file);
    });

    uploadAbortController.current = new AbortController();

    try {
      const uploadUrl = sessionId ? `http://${host}/api/upload?session_id=${sessionId}` : `http://${host}/api/upload`;
      const res = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        signal: uploadAbortController.current.signal,
      });

      if (!res.ok) throw new Error('Upload failed');

      const data = await res.json();
      setSessionId(data.session_id);

      setPendingFiles({
        paths: data.files,
        names: Array.from(files).map(f => f.name)
      });

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Upload aborted');
      } else {
        console.error(err);
        addMessage({
          role: 'assistant',
          content: 'Failed to upload files. Please try again.',
          type: 'error'
        });
        setPendingFiles(null);
        if (messages.length === 0) setShowChatInput(false);
      }
    } finally {
      setIsUploading(false);
      uploadAbortController.current = null;
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleStartTranscription = (prompt: string) => {
    if (!pendingFiles) return;

    const userMessage = prompt || 'Start the transcription';

    addMessage({
      role: 'user',
      content: userMessage,
      type: 'text',
      files: { names: pendingFiles.names }
    });

    if (prompt) {
      setQueuedPrompt(prompt);
    }

    sendFiles(pendingFiles.paths);
    setPendingFiles(null);
  };

  const handleNewChat = () => {
    useChatStore.getState().clearMessages();
    useChatStore.getState().setSessionId(null);
    setShowChatInput(false);
    setPendingFiles(null);
    setShowSettings(false);
  };

  const handleLoadSession = async (sessionId: string) => {
    const res = await fetch(`http://${host}/api/sessions/${sessionId}`);
    if (!res.ok) return;
    const data = await res.json();
    useChatStore.getState().clearMessages();
    useChatStore.getState().setSessionId(sessionId);
    setShowSettings(false);
    for (const t of data.transcriptions) {
      addMessage({
        role: 'assistant',
        type: 'result',
        content: t.text_content || '',
        file: t.filename,

      });
    }
    for (const msg of data.chats) {
      addMessage({
        role: msg.role as 'user' | 'assistant',
        type: 'text',
        content: msg.content,
      });
    }
    if (data.transcriptions.length > 0 || data.chats.length > 0) {
      setShowChatInput(true);
    }
  };

  const checkChatModelValid = async (): Promise<boolean> => {
    if (settings.chatProvider === 'external') return true;
    
    const isCustomPath = settings.chatModel.includes('/') || settings.chatModel.includes('\\') || settings.chatModel.endsWith('.gguf');
    
    try {
      if (!isCustomPath) {
        const res = await fetch(`http://${host}/api/models`);
        const data = await res.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const modelInfo = data.models.find((m: any) => m.name === settings.chatModel && m.type === 'chat');
        if (modelInfo && modelInfo.downloaded) return true;
      } else {
        const res = await fetch(`http://${host}/api/validate-path?path=${encodeURIComponent(settings.chatModel)}`);
        const data = await res.json();
        if (data.exists) return true;
      }
    } catch (e) {
      console.error('Model validation failed', e);
    }
    
    return false;
  };

  const handleSendQuestion = async (question: string) => {
    const isValid = await checkChatModelValid();
    if (!isValid) {
      addMessage({
        role: 'assistant',
        type: 'error',
        content: 'Your selected chat model could not be found. It may have been deleted. Please open Settings and select or download a valid AI model.'
      });
      // Fallback
      setSettings({ chatModel: 'qwen3.5-2b' });
      return;
    }

    addMessage({
      role: 'user',
      type: 'text',
      content: question
    });
    sendQuestion(question);
  };

  const getChatModelDisplay = () => {
    if (settings.chatProvider === 'external') {
      return settings.externalModels?.find(m => m.id === settings.selectedExternalModelId)?.name || 'External API';
    }
    const builtin: Record<string, string> = {
      'qwen3.5-2b': 'Qwen 3.5 2B',
      'qwen3.5-4b': 'Qwen 3.5 4B',
      'qwen3.5-9b': 'Qwen 3.5 9B'
    };
    if (builtin[settings.chatModel]) return builtin[settings.chatModel];
    
    const custom = settings.customLocalModels?.find(m => m.path === settings.chatModel);
    if (custom) return custom.name;
    
    if (settings.chatModel && settings.chatModel !== 'skip') {
      const filename = settings.chatModel.split('/').pop() || settings.chatModel;
      return `Custom: ${filename}`;
    }
    
    return 'Local Model';
  };

  const renderMessage = (msg: typeof messages[0]) => {
    if (msg.role === 'system') return null;
    switch (msg.type) {
      case 'progress':
        return (
          <ProgressMessage
            key={msg.id}
            file={msg.file || ''}
            percent={msg.percent || 0}
            content={msg.content}
          />
        );
      case 'result':
        return (
          <ResultMessage
            key={msg.id}
            file={msg.file || ''}
            content={msg.content}
          />
        );
      case 'error':
      case 'cancelled':
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex max-w-4xl mx-auto gap-4"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[var(--error)] text-white">
              <span className="text-sm">!</span>
            </div>
            <div className="px-4 py-3 rounded-2xl shadow-md bg-[var(--message-assistant-bg)] text-[var(--error)] rounded-tl-sm font-medium">
              {msg.content}
            </div>
          </motion.div>
        );
      default:
        return (
          <ChatMessage
            key={msg.id}
            msg={msg as { content: string; role: 'user' | 'assistant'; files?: { names: string[] } }}
          />
        );
    }
  };

  if (needsSetup === null) {
    return (
      <div className="flex h-screen bg-transparent text-[var(--foreground)] items-center justify-center">
        <Loader2 className="animate-spin text-[var(--accent)] w-8 h-8" />
      </div>
    );
  }

  if (needsSetup) {
    return <SetupScreen onComplete={() => setNeedsSetup(false)} />;
  }

  return (
    <div className="flex h-screen bg-transparent text-[var(--foreground)]">

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onNewChat={handleNewChat}
        onLoadSession={handleLoadSession}
        currentSessionId={sessionId}
        onSettingsClick={() => setShowSettings(true)}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center p-4 border-b border-[var(--glass-border)] bg-black/5 dark:bg-white/5 backdrop-blur-sm shrink-0">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors mr-3">
            <PanelLeft size={20} className="text-[var(--foreground-secondary)]" />
          </button>
          <span className="font-semibold text-lg text-[var(--foreground)]">Voice2Knowledge</span>
        </div>

        {showSettings ? (
          <SettingsScreen
            onClose={() => setShowSettings(false)}
            settings={settings}
            onSettingsChange={setSettings}
            isDisabled={isTranscribing}
            resolvedTheme={resolvedTheme}
            onThemeToggle={toggleTheme}
          />
        ) : (
          <>
            <input
              type="file"
              multiple
              accept=".wav,.mp3,.m4a,.flac,.ogg,.webm,.mp4"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileUpload}
            />

            <div className="flex-1 overflow-y-auto p-4 md:p-8">
              {messages.length === 0 ? (
                <EmptyState onUploadClick={() => fileInputRef.current?.click()} />
              ) : (
                <div className="space-y-6">
                  <AnimatePresence>
                    {messages.map((msg) => (
                      renderMessage(msg)
                    ))}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {(messages.length > 0 || pendingFiles) && (
              <div className="glass-panel rounded-t-2xl border-b-0 border-x-0 sm:border-x sm:border-b sm:rounded-2xl sm:mb-4 sm:mx-4 p-4 shadow-xl">
              <div className="max-w-4xl mx-auto relative flex items-center gap-2">
                {!showChatInput ? (
                  <div className="flex-1 flex gap-2">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                      disabled={isTranscribing || isUploading || isGenerating}
                      className={cn(
                        'flex-1 py-4 px-6 rounded-xl border border-dashed flex items-center justify-center gap-3 transition-all duration-300 glass-panel glass-panel-hover',
                        (isTranscribing || isUploading || isGenerating)
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:border-[var(--accent)] text-[var(--foreground)] hover:text-[var(--accent)]'
                      )}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="animate-spin" size={20} />
                          <span className="font-medium">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={20} />
                          <span className="font-medium">Upload audio files to transcribe</span>
                        </>
                      )}
                    </button>

                    {/* Bug Fix: Allow returning to chat if there are transcriptions available */}
                    {sessionId && messages.some(m => m.type === 'result') && !isTranscribing && !isUploading && (
                      <button
                        onClick={() => setShowChatInput(true)}
                        className="shrink-0 px-6 py-4 rounded-xl border glass-panel glass-panel-hover text-[var(--foreground)] transition-colors font-medium shadow-md"
                      >
                        Return to Chat
                      </button>
                    )}

                    {isTranscribing && (
                      <button
                        onClick={cancelTranscription}
                        className="shrink-0 px-4 py-3 rounded-xl bg-[var(--error)]/20 text-[var(--error)] border border-[var(--error)]/30 hover:bg-[var(--error)]/40 flex items-center gap-2 font-medium transition-colors shadow-md backdrop-blur-md"
                      >
                        <SquareSquare size={18} />
                        <span className="hidden sm:inline">Stop</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center">
                    <div className="w-full flex items-end gap-2">
                      <div className="flex-1 w-full">
                        <ChatInput
                          onSend={handleSendQuestion}
                          onStartTranscription={handleStartTranscription}
                          pendingFiles={pendingFiles}
                          onCancel={cancelGeneration}
                          onUploadClick={() => fileInputRef.current?.click()}
                          isGenerating={isGenerating}
                          isUploading={isUploading}
                          onClearPendingFiles={cancelUpload}
                          disabled={isTranscribing || (!sessionId && !pendingFiles)}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-xs font-medium text-[var(--foreground-tertiary)]">
                      <span>Transcription Model: Whisper {settings.model.charAt(0).toUpperCase() + settings.model.slice(1)}</span>
                      <span>•</span>
                      <span>Chat Model: {getChatModelDisplay()}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}