import { useState, useEffect, startTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download } from 'lucide-react';

interface DownloadConfirmModalProps {
  isOpen: boolean;
  modelName: string;
  modelType: 'whisper' | 'chat';
  onConfirm: () => void;
  onCancel: () => void;
  onComplete: () => void;
}

export function DownloadConfirmModal({
  isOpen,
  modelName,
  modelType,
  onConfirm,
  onCancel,
  onComplete
}: DownloadConfirmModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      startTransition(() => {
        setIsDownloading(false);
        setProgress(0);
        setError(null);
      });
    }
  }, [isOpen]);

  const handleStartDownload = () => {
    setIsDownloading(true);
    onConfirm();

    const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
      ? window.location.host 
      : '127.0.0.1:8000';

    const wsUrl = `ws://${host}/ws/download/${modelType}/${modelName}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'progress') {
          setProgress(data.percent);
        } else if (data.type === 'done') {
          setProgress(100);
          setTimeout(() => {
            onComplete();
          }, 500);
        } else if (data.type === 'error') {
          setError(data.message);
          setIsDownloading(false);
        }
      } catch (err) {
        console.error(err);
      }
    };

    ws.onerror = () => {
      setError('Failed to connect to download server.');
      setIsDownloading(false);
    };
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={!isDownloading ? onCancel : undefined}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-2xl p-6 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--foreground)]">Download Required</h3>
                <p className="text-sm text-[var(--foreground-secondary)]">
                  {modelType === 'whisper' ? 'Transcription Engine' : 'AI Assistant'}
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="mb-6">
              {!isDownloading ? (
                <p className="text-[var(--foreground)] leading-relaxed">
                  You selected the <span className="font-semibold text-[var(--accent)]">{modelName}</span> model. 
                  This model is not currently downloaded on your system. 
                  <br /><br />
                  Would you like to download it now to use it?
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-[var(--foreground)]">Downloading Model Files...</span>
                    <span className="text-[var(--accent)]">{progress}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-[var(--background-secondary)] rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-[var(--accent)]"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ ease: "linear", duration: 0.2 }}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 bg-[var(--error)]/10 text-[var(--error)] rounded-lg text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Footer / Actions */}
            {!isDownloading && (
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={onCancel}
                  className="px-4 py-2 rounded-lg font-medium text-[var(--foreground-secondary)] hover:bg-[var(--background-secondary)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartDownload}
                  className="px-4 py-2 rounded-lg font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Now
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
