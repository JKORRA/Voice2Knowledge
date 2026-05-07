import React, { useState, useRef, useEffect } from 'react';
import { Upload, SquareSquare, Loader2 } from 'lucide-react';
import { useChatStore } from './stores/chatStore';
import { useWebSocket } from './hooks/useWebSocket';
import { useChatWebSocket } from './hooks/useChatWebSocket';
import { useTheme } from './hooks/useTheme';
import { Header } from './components/Header';
import { SettingsPanel } from './components/SettingsPanel';
import { EmptyState } from './components/EmptyState';
import { ChatMessage } from './components/ChatMessage';
import { ProgressMessage } from './components/ProgressMessage';
import { ResultMessage } from './components/ResultMessage';
import { ChatInput } from './components/ChatInput';
import { ContextSelector } from './components/ContextSelector';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './lib/utils';

export default function App() {
  const {
    messages,
    settings,
    setSettings,
    isConnected,
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? window.location.host
        : '127.0.0.1:8000';

      const res = await fetch(`http://${host}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');

      const data = await res.json();
      setSessionId(data.session_id);

      addMessage({
        role: 'user',
        content: `Transcribe ${files.length} file(s):\n${Array.from(files).map(f => f.name).join(', ')}`,
        type: 'text'
      });

      setTimeout(() => {
        sendFiles(data.files);
      }, 500);

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
            txtPath={msg.txtPath}
            vttPath={msg.vttPath}
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
            content={msg.content}
            role={msg.role as 'user' | 'assistant'}
          />
        );
    }
  };

  return (
    <div className="flex h-screen bg-[var(--background)] text-[var(--foreground)]">
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSettingsChange={setSettings}
        isDisabled={isTranscribing}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header
          onSettingsClick={() => setShowSettings(true)}
          isConnected={isConnected}
          theme="system"
          resolvedTheme={resolvedTheme}
          onThemeToggle={toggleTheme}
        />

        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[var(--background)]">
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

        <div className="bg-[var(--card)] border-t border-[var(--border)] p-4">
          <div className="max-w-4xl mx-auto relative flex items-center gap-2">
            <input
              type="file"
              multiple
              accept=".wav,.mp3,.m4a,.flac,.ogg,.webm,.mp4"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileUpload}
            />

            {!showChatInput ? (
              <div className="flex-1 flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isTranscribing || isUploading || isGenerating}
                  className={cn(
                    'flex-1 py-4 px-6 rounded-xl border-2 border-dashed flex items-center justify-center gap-3 transition-all duration-200',
                    (isTranscribing || isUploading || isGenerating)
                      ? 'bg-[var(--background-secondary)] border-[var(--border)] cursor-not-allowed text-[var(--foreground-tertiary)]'
                      : 'bg-[var(--background-secondary)] border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 text-[var(--foreground-secondary)] hover:text-[var(--accent)]'
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
                    className="shrink-0 px-6 py-4 rounded-xl border border-[var(--border)] bg-[var(--background-secondary)] hover:bg-[var(--border)] text-[var(--foreground-secondary)] transition-colors font-medium"
                  >
                    Return to Chat
                  </button>
                )}
                
                {isTranscribing && (
                  <button
                    onClick={cancelTranscription}
                    className="shrink-0 px-4 py-3 rounded-xl bg-[var(--error)]/10 text-[var(--error)] border border-[var(--error)]/20 hover:bg-[var(--error)]/20 flex items-center gap-2 font-medium transition-colors"
                  >
                    <SquareSquare size={18} />
                    <span className="hidden sm:inline">Stop</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="w-full flex flex-col items-center">
                <ContextSelector />
                <div className="w-full flex items-end gap-2">
                  <button
                    onClick={() => setShowChatInput(false)}
                    disabled={isGenerating || isTranscribing}
                    className={cn("shrink-0 p-4 rounded-xl border border-[var(--border)] bg-[var(--background-secondary)] text-[var(--foreground-secondary)] transition-colors", 
                      (isGenerating || isTranscribing) ? "opacity-50 cursor-not-allowed" : "hover:bg-[var(--border)]")}
                    title="Upload more files"
                  >
                    <Upload size={20} />
                  </button>
                  <div className="flex-1">
                    <ChatInput
                      onSend={handleSendQuestion}
                      onCancel={cancelGeneration}
                      isGenerating={isGenerating}
                      disabled={isTranscribing || !sessionId}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}