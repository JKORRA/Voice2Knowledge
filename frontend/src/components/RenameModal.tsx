import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface RenameModalProps {
  isOpen: boolean;
  initialTitle: string;
  onClose: () => void;
  onSave: (newTitle: string) => void;
}

export function RenameModal({ isOpen, initialTitle, onClose, onSave }: RenameModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, initialTitle]);

  const handleSave = () => {
    if (title.trim()) {
      onSave(title.trim());
    } else {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="relative w-[90%] max-w-md p-6 rounded-2xl bg-[var(--card-elevated)] border border-[var(--glass-border)] shadow-xl z-10"
          >
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
              Rename this chat
            </h3>

            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-4 py-2 mb-6 text-[var(--foreground)] bg-black/5 dark:bg-white/5 border border-[var(--glass-border)] rounded-xl outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
            />

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-xl transition-colors shadow-sm"
              >
                Rename
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
