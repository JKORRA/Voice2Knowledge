import { motion } from 'framer-motion';
import { Settings, Bot, Moon, Sun } from 'lucide-react';
import { cn } from '../lib/utils';

interface HeaderProps {
  onSettingsClick: () => void;
  isConnected: boolean;
  theme: 'light' | 'dark' | 'system';
  resolvedTheme: 'light' | 'dark';
  onThemeToggle: () => void;
}

export function Header({
  onSettingsClick,
  isConnected,
  resolvedTheme,
  onThemeToggle,
}: HeaderProps) {
  const getThemeIcon = () => {
    if (resolvedTheme === 'light') return <Sun size={18} />;
    return <Moon size={18} />;
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="h-14 border-b bg-[var(--card)] flex items-center justify-between px-4 shadow-sm shrink-0"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center">
          <Bot size={18} className="text-white" />
        </div>
        <h1 className="font-semibold text-lg text-[var(--foreground)]">
          Voice2Knowledge
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onThemeToggle}
          className="p-2 hover:bg-[var(--button-secondary-hover)] rounded-lg transition-colors text-[var(--foreground-secondary)]"
          title={`Current: ${resolvedTheme}. Click to toggle.`}
        >
          {getThemeIcon()}
        </button>

        <button
          onClick={onSettingsClick}
          className="p-2 hover:bg-[var(--button-secondary-hover)] rounded-lg transition-colors text-[var(--foreground-secondary)]"
          title="Settings"
        >
          <Settings size={20} />
        </button>

        <div className="flex items-center gap-2 text-sm">
          <span
            className={cn(
              'w-2 h-2 rounded-full',
              isConnected ? 'bg-[var(--success)]' : 'bg-[var(--foreground-tertiary)]'
            )}
          />
          <span className="text-[var(--foreground-secondary)]">
            {isConnected ? 'Ready' : 'Offline'}
          </span>
        </div>
      </div>
    </motion.header>
  );
}