import React, { useState, useRef, useEffect } from 'react';
import { Send, SquareSquare, FileAudio, Upload } from 'lucide-react';
import { cn } from '../lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStartTranscription?: () => void;
  pendingFiles?: { paths: string[], names: string[] } | null;
  onUploadClick?: () => void;
  onCancel: () => void;
  isGenerating: boolean;
  disabled: boolean;
  placeholder?: string;
}

export function ChatInput({ 
  onSend, 
  onStartTranscription,
  pendingFiles,
  onUploadClick,
  onCancel, 
  isGenerating, 
  disabled, 
  placeholder = "Ask a question about the transcription..." 
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSend = () => {
    if (pendingFiles && onStartTranscription) {
      onStartTranscription();
    } else if (input.trim() && !isGenerating && !disabled) {
      onSend(input.trim());
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn(
      "relative flex flex-col gap-3 max-w-4xl mx-auto w-full glass-panel rounded-3xl p-4 transition-all duration-300 focus-within:border-[var(--glass-border-focus)] focus-within:shadow-[0_8px_32px_rgba(0,122,255,0.15)]",
      (disabled || isGenerating) ? "opacity-50 cursor-not-allowed" : ""
    )}>
      {pendingFiles && pendingFiles.names.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pendingFiles.names.map((name, idx) => (
            <div key={idx} className="flex flex-col gap-1 bg-black/5 dark:bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-[var(--glass-border)] shadow-sm min-w-[120px] max-w-[200px]">
              <span className="text-xs font-semibold text-[var(--foreground)] truncate w-full" title={name}>{name}</span>
              <div className="flex items-center gap-1.5 mt-1">
                <FileAudio size={14} className="text-[var(--accent)]" />
                <span className="text-[10px] uppercase font-bold text-[var(--foreground-tertiary)]">Audio</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2 w-full">
        {onUploadClick && (
          <button
            onClick={onUploadClick}
            disabled={disabled || isGenerating}
            className={cn(
              "shrink-0 p-3 rounded-full transition-colors flex items-center justify-center",
              (disabled || isGenerating)
                ? "text-[var(--foreground-tertiary)] cursor-not-allowed"
                : "text-[var(--foreground-secondary)] hover:bg-[var(--foreground)]/5"
            )}
            title="Upload files"
          >
            <Upload size={20} />
          </button>
        )}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled && !pendingFiles ? "System is busy..." : placeholder}
          disabled={disabled || isGenerating || !!pendingFiles}
          className="w-full resize-none bg-transparent text-[var(--foreground)] outline-none focus:outline-none focus-visible:outline-none overflow-hidden placeholder-[var(--foreground-tertiary)] self-center pt-2"
          style={{ minHeight: '28px', maxHeight: '200px' }}
          rows={1}
        />
        {isGenerating ? (
          <button
            onClick={onCancel}
            className="shrink-0 p-3 rounded-full bg-[var(--error)]/10 text-[var(--error)] hover:bg-[var(--error)]/20 transition-colors"
            title="Stop generating"
          >
            <SquareSquare size={20} />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={(!pendingFiles && !input.trim()) || disabled}
            className={cn(
              "shrink-0 p-3 rounded-full transition-colors flex items-center justify-center",
              (!pendingFiles && !input.trim()) || disabled
                ? "bg-transparent text-[var(--foreground-tertiary)] cursor-not-allowed"
                : "bg-[var(--foreground)] text-[var(--background)] hover:opacity-80"
            )}
            title={pendingFiles ? "Start transcription" : "Send message"}
          >
            <Send size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
