import { motion } from 'framer-motion';
import { Bot, Upload, Mic } from 'lucide-react';

interface EmptyStateProps {
  onUploadClick: () => void;
}

export function EmptyState({ onUploadClick }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="h-full flex flex-col items-center justify-center text-center px-4"
    >
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center shadow-xl">
          <Bot size={48} className="text-white" />
        </div>
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-[var(--card)] border-2 border-[var(--border)] flex items-center justify-center shadow-md"
        >
          <Mic size={18} className="text-[var(--accent)]" />
        </motion.div>
      </div>

      <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-2">
        Voice2Knowledge
      </h2>
      <p className="text-[var(--foreground-secondary)] mb-8 max-w-md">
        Transcribe your work calls, lectures, and audio files into text instantly.
        Your personal AI transcription assistant.
      </p>

      <button
        onClick={onUploadClick}
        className="group relative flex items-center gap-3 px-8 py-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200"
      >
        <Upload size={20} className="group-hover:scale-110 transition-transform" />
        <span>Upload audio files to transcribe</span>
      </button>

      <div className="mt-8 flex items-center gap-6 text-sm text-[var(--foreground-tertiary)]">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
          Free to use
        </span>
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
          GPU accelerated
        </span>
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--warning)]" />
          Privacy first
        </span>
      </div>

      <p className="mt-8 text-xs text-[var(--foreground-tertiary)]">
        Supports WAV, MP3, M4A, FLAC, OGG, WebM, MP4
      </p>
    </motion.div>
  );
}