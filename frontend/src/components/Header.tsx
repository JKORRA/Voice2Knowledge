import { motion } from 'framer-motion';
import { Settings, Bot, Clock, Plus } from 'lucide-react';

interface HeaderProps {
  onSettingsClick: () => void;
  onHistoryClick: () => void;
  onNewChat: () => void;
}

export function Header({
  onSettingsClick,
  onHistoryClick,
  onNewChat,
}: HeaderProps) {

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="h-16 mx-4 mt-4 mb-2 rounded-2xl glass-panel flex items-center justify-between px-6 shadow-lg shrink-0 z-10"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center">
          <Bot size={18} className="text-white" />
        </div>
        <h1 className="font-semibold text-lg text-[var(--foreground)]">
          Voice2Knowledge
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onNewChat}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
          title="New Chat"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">New Chat</span>
        </button>

        <div className="w-px h-6 bg-[var(--glass-border)] mx-1" />

        <button
          onClick={onHistoryClick}
          className="p-2 hover:bg-[var(--button-secondary-hover)] rounded-xl transition-colors text-[var(--foreground-secondary)]"
          title="History"
        >
          <Clock size={20} />
        </button>

        <button
          onClick={onSettingsClick}
          className="p-2 hover:bg-[var(--button-secondary-hover)] rounded-xl transition-colors text-[var(--foreground-secondary)]"
          title="Settings"
        >
          <Settings size={20} />
        </button>
      </div>
    </motion.header>
  );
}