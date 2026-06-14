import { motion } from 'framer-motion';
import { Bot, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { getOriginalFilename } from '../lib/utils';

interface ResultMessageProps {
  file: string;
  content: string;
}

export function ResultMessage({ file, content }: ResultMessageProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const fileName = getOriginalFilename(file);
  const isLong = content.length > 500;
  const displayContent = isLong && !expanded ? content.substring(0, 500) + '...' : content;

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
      // Silent fail - do not crash
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="flex max-w-4xl mx-auto gap-4"
    >
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[var(--success)] text-white">
        <Bot size={18} />
      </div>

      <div className="flex flex-col gap-3 max-w-[80%] px-4 py-3 rounded-2xl shadow-lg glass-panel text-[var(--message-assistant-foreground)] rounded-tl-sm border border-[var(--glass-border)] backdrop-blur-md">
        <div className="flex items-center gap-2 text-[var(--success)] font-medium">
          <Check size={16} />
          <span className="text-sm">Transcription Complete</span>
          <span className="text-xs text-[var(--foreground-tertiary)] font-normal ml-auto">
            {fileName}
          </span>
        </div>

        <div className="relative group">
          <pre className="whitespace-pre-wrap font-sans text-[15px] leading-relaxed text-[var(--foreground)]">
            {displayContent}
          </pre>

          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-[var(--button-secondary-hover)] transition-all"
            title="Copy text"
          >
            {copied ? <Check size={14} className="text-[var(--success)]" /> : <Copy size={14} />}
          </button>
        </div>

        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-sm text-[var(--accent)] hover:underline"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}

        <div className="flex gap-2 pt-2 border-t border-[var(--border)]">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[var(--foreground)] text-sm font-medium rounded-md border border-[var(--glass-border)] transition-colors backdrop-blur-sm"
            title="Copy to clipboard"
          >
            {copied ? <Check size={14} className="text-[var(--success)]" /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}