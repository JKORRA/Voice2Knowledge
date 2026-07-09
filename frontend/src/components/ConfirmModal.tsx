import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ 
  isOpen, 
  title, 
  message, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel', 
  onConfirm, 
  onCancel 
}: ConfirmModalProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => confirmButtonRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onCancel();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="relative w-[90%] max-w-md p-6 rounded-2xl bg-[var(--card-elevated)] border border-[var(--glass-border)] shadow-xl z-10"
            onKeyDown={handleKeyDown}
          >
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
              {title}
            </h3>

            <p className="text-sm text-[var(--foreground-secondary)] mb-6">
              {message}
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
              >
                {cancelText}
              </button>
              <button
                ref={confirmButtonRef}
                onClick={onConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-[var(--error)] hover:bg-[var(--error)]/90 rounded-xl transition-colors shadow-sm"
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
