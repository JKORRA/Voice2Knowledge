import React, { useState, useRef, useEffect } from 'react';
import { Upload, SquareSquare, Loader2 } from 'lucide-react';
import { useChatStore } from './stores/chatStore';
import { useWebSocket } from './hooks/useWebSocket';
import { useChatWebSocket } from './hooks/useChatWebSocket';
import { useTheme } from './hooks/useTheme';
import { Header } from './components/Header';
import { SettingsPanel } from './components/SettingsPanel';
import { HistoryPanel } from './components/HistoryPanel';
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
    isGenerating
  } = useChatStore();

  const { sendFiles, cancelTranscription } = useWebSocket(sessionId);
  const { sendQuestion, cancelGeneration } = useChatWebSocket(sessionId);
  const { resolvedTheme, toggleTheme } = useTheme();

  const [isUploading, setIsUploading] = useState(false);
  const [showChatInput, setShowChatInput] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<{ paths: string[], names: string[] } | null>(null);
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? window.location.host
    : '127.0.0.1:8000';

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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append('files', file);
    });

    try {
      const uploadUrl = sessionId ? `http://${host}/api/upload?session_id=${sessionId}` : `http://${host}/api/upload`;
      const res = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');

      const data = await res.json();
      setSessionId(data.session_id);

      setPendingFiles({
        paths: data.files,
        names: Array.from(files).map(f => f.name)
      });

    } catch (err) {
      console.error(err);
      addMessage({
        role: 'assistant',
        content: 'Failed to upload files. Please try again.',
        type: 'error'
      });
    } finally {
      setIsUploading(false);
      setShowChatInput(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleStartTranscription = () => {
    if (!pendingFiles) return;

    addMessage({
      role: 'user',
      content: `Start the transcription`,
      type: 'text',
      files: { names: pendingFiles.names }
    });

    sendFiles(pendingFiles.paths);
    setPendingFiles(null);
  };

  const handleNewChat = () => {
    useChatStore.getState().clearMessages();
    useChatStore.getState().setSessionId(null);
    setShowChatInput(false);
    setPendingFiles(null);
  };

  const handleLoadSession = async (sessionId: string) => {
    const res = await fetch(`http://${host}/api/sessions/${sessionId}`);
    if (!res.ok) return;
    const data = await res.json();
    useChatStore.getState().clearMessages();
    useChatStore.getState().setSessionId(sessionId);
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

  const handleSendQuestion = (question: string) => {
    addMessage({
      role: 'user',
      type: 'text',
      content: question
    });
    sendQuestion(question);
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
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSettingsChange={setSettings}
        isDisabled={isTranscribing}
        resolvedTheme={resolvedTheme}
        onThemeToggle={toggleTheme}
      />

      <HistoryPanel
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onLoadSession={handleLoadSession}
        currentSessionId={sessionId}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <input
          type="file"
          multiple
          accept=".wav,.mp3,.m4a,.flac,.ogg,.webm,.mp4"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileUpload}
        />
        <Header
          onSettingsClick={() => setShowSettings(true)}
          onHistoryClick={() => setShowHistory(true)}
          onNewChat={handleNewChat}
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
                      disabled={isTranscribing || (!sessionId && !pendingFiles)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs font-medium text-[var(--foreground-tertiary)]">
                  <span>Transcription Model: Whisper {settings.model}</span>
                  <span>•</span>
                  <span>Chat Model: {settings.chatModel === 'qwen2.5-3b' ? 'Qwen 2.5 3B' : settings.chatModel === 'llama-3.2-1b' ? 'Llama 3.2 1B' : 'Phi 3.5 Mini'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}