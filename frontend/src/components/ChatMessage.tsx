import { motion } from 'framer-motion';
import { Bot, User, Copy, Check, FileAudio } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';

interface ChatMessageProps {
  msg: {
    content: string;
    role: 'user' | 'assistant';
    files?: { names: string[] };
    isStreaming?: boolean;
  };
}

export function ChatMessage({ msg }: ChatMessageProps) {
  const { content, role } = msg;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      // 1. Detect if we are running inside pywebview
      const isWebView = typeof window !== 'undefined' && (window as { pywebview?: unknown }).pywebview !== undefined;

      // 2. Force the fallback if in pywebview, OR if secure context/clipboard API is missing
      if (isWebView || !navigator.clipboard || !window.isSecureContext) {
        const textArea = document.createElement("textarea");
        textArea.value = content;
        
        // Prevent scrolling to bottom
        textArea.style.position = "absolute";
        textArea.style.left = "-999999px";
        
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      }

      // 3. Normal browser behavior
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        'flex max-w-4xl mx-auto gap-4',
        role === 'user' ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-md',
          role === 'user'
            ? 'bg-[var(--accent)] text-white shadow-[0_4px_12px_rgba(0,122,255,0.3)]'
            : 'glass-panel text-[var(--accent)]'
        )}
      >
        {role === 'user' ? <User size={18} /> : <Bot size={18} />}
      </div>

      <div
        className={cn(
          'relative flex flex-col gap-2 max-w-[80%] px-4 py-3 rounded-2xl shadow-lg backdrop-blur-md border border-[var(--glass-border)]',
          role === 'user'
            ? 'bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] text-white rounded-tr-sm border-white/20'
            : 'glass-panel text-[var(--message-assistant-foreground)] rounded-tl-sm'
        )}
      >
        {role === 'user' && (msg.files?.names.length || 0) > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {msg.files!.names.map((name, idx) => (
              <div key={idx} className="flex flex-col gap-1 bg-black/20 p-2 rounded-xl border border-white/20 min-w-[120px] max-w-[200px]">
                <span className="text-xs font-semibold truncate" title={name}>{name}</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <FileAudio size={12} className="opacity-70" />
                  <span className="text-[10px] uppercase font-bold opacity-70">Audio</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <pre className="whitespace-pre-wrap font-sans text-[15px] leading-relaxed font-normal">
          {msg.content}
        </pre>

        {role === 'assistant' && !msg.isStreaming && (
          <div className="flex gap-2 pt-2 mt-2 border-t border-[var(--border)]">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[var(--foreground)] text-sm font-medium rounded-md border border-[var(--glass-border)] transition-colors backdrop-blur-sm"
              title="Copy to clipboard"
            >
              {copied ? <Check size={14} className="text-[var(--success)]" /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}