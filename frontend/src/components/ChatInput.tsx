import React, { useState, useRef, useEffect } from 'react';
import { Send, SquareSquare } from 'lucide-react';
import { cn } from '../lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  onCancel: () => void;
  isGenerating: boolean;
  disabled: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, onCancel, isGenerating, disabled, placeholder = "Ask a question about the transcription..." }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSend = () => {
    if (input.trim() && !isGenerating && !disabled) {
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
    <div className="relative flex items-end gap-2 max-w-4xl mx-auto w-full">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? "System is busy..." : placeholder}
        disabled={disabled || isGenerating}
        className={cn(
          "w-full resize-none py-4 px-6 rounded-2xl border-2 border-[var(--border)] bg-[var(--background-secondary)] text-[var(--foreground)] outline-none transition-all duration-200 overflow-hidden",
          (disabled || isGenerating) ? "opacity-50 cursor-not-allowed" : "focus:border-[var(--accent)] hover:border-[var(--accent)]/50",
          "placeholder-[var(--foreground-tertiary)]"
        )}
        style={{ minHeight: '56px', maxHeight: '200px' }}
        rows={1}
      />
      {isGenerating ? (
        <button
          onClick={onCancel}
          className="shrink-0 p-4 rounded-xl bg-[var(--error)]/10 text-[var(--error)] hover:bg-[var(--error)]/20 transition-colors"
          title="Stop generating"
        >
          <SquareSquare size={20} />
        </button>
      ) : (
        <button
          onClick={handleSend}
          disabled={!input.trim() || disabled}
          className={cn(
            "shrink-0 p-4 rounded-xl transition-colors",
            !input.trim() || disabled
              ? "bg-[var(--border)] text-[var(--foreground-tertiary)] cursor-not-allowed"
              : "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
          )}
          title="Send message"
        >
          <Send size={20} />
        </button>
      )}
    </div>
  );
}
