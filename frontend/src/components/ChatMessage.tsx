import { motion } from 'framer-motion';
import { Bot, User, Copy, Check, FileAudio } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';

interface ChatMessageProps {
  msg: {
    content: string;
    role: 'user' | 'assistant';
    files?: { names: string[] };
  };
}

export function ChatMessage({ msg }: ChatMessageProps) {
  const { content, role } = msg;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
          role === 'user'
            ? 'bg-[var(--accent)] text-white'
            : 'bg-[var(--card)] border border-[var(--border)] text-[var(--accent)]'
        )}
      >
        {role === 'user' ? <User size={18} /> : <Bot size={18} />}
      </div>

      <div
        className={cn(
          'relative flex flex-col gap-2 max-w-[80%] px-4 py-3 rounded-2xl shadow-md',
          role === 'user'
            ? 'bg-[var(--message-user-bg)] text-[var(--message-user-foreground)] rounded-tr-sm'
            : 'bg-[var(--message-assistant-bg)] text-[var(--message-assistant-foreground)] rounded-tl-sm'
        )}
      >
        {role === 'user' && (msg.files?.names.length || 0) > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {msg.files!.names.map((name, idx) => (
              <div key={idx} className="flex flex-col gap-1 bg-black/10 dark:bg-white/10 p-2 rounded-xl border border-black/5 dark:border-white/5 min-w-[120px] max-w-[200px]">
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

        {role === 'assistant' && (
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-[var(--button-secondary-hover)] transition-all"
            title="Copy text"
          >
            {copied ? <Check size={14} className="text-[var(--success)]" /> : <Copy size={14} />}
          </button>
        )}
      </div>
    </motion.div>
  );
}