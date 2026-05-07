import { motion } from 'framer-motion';
import { Bot, AudioLines } from 'lucide-react';

interface ProgressMessageProps {
  file: string;
  percent: number;
  content?: string;
}

export function ProgressMessage({ file, percent, content }: ProgressMessageProps) {
  const fileName = file.split('/').pop() || file;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="flex max-w-4xl mx-auto gap-4"
    >
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[var(--accent)] text-white">
        <Bot size={18} />
      </div>

      <div className="flex flex-col gap-3 max-w-[80%] px-4 py-3 rounded-2xl shadow-md bg-[var(--message-assistant-bg)] text-[var(--message-assistant-foreground)] rounded-tl-sm">
        <div className="flex items-center gap-2 text-[var(--accent)] font-medium">
          <AudioLines size={16} className="animate-pulse" />
          <span className="text-sm">Transcribing</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10">
            <svg className="w-10 h-10 transform -rotate-90">
              <circle
                cx="20"
                cy="20"
                r="16"
                stroke="var(--progress-bg)"
                strokeWidth="3"
                fill="none"
              />
              <motion.circle
                cx="20"
                cy="20"
                r="16"
                stroke="var(--accent)"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeDasharray="100"
                initial={{ strokeDashoffset: 100 }}
                animate={{ strokeDashoffset: 100 - percent }}
                transition={{ duration: 0.3 }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
              {percent}%
            </span>
          </div>

          <div className="flex-1 flex flex-col gap-1">
            <span className="text-sm font-medium truncate max-w-[180px]">{fileName}</span>
            <div className="w-full bg-[var(--progress-bg)] rounded-full h-1.5 overflow-hidden">
              <motion.div
                className="bg-[var(--accent)] h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </div>

        {content && (
          <p className="text-sm text-[var(--foreground-tertiary)] italic line-clamp-2 pt-2 border-t border-[var(--border)]">
            "{content}"
          </p>
        )}
      </div>
    </motion.div>
  );
}