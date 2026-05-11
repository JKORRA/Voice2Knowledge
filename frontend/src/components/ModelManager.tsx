import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Trash2, Sparkles, Loader2, CheckCircle, Circle } from 'lucide-react';
import { cn } from '../lib/utils';

interface Model {
  name: string;
  type: string;
  downloaded: boolean;
}

interface ModelManagerProps {
  isOpen: boolean;
  onClose: () => void;
  currentModel: string;
  currentChatModel: string;
}

export function ModelManager({ isOpen, onClose, currentModel, currentChatModel }: ModelManagerProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchModels();
    }
  }, [isOpen]);

  const fetchModels = async () => {
    setLoading(true);
    try {
      const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? window.location.host
        : '127.0.0.1:8000';

      const res = await fetch(`http://${host}/api/models`);
      const data = await res.json();
      setModels(data.models);
    } catch (err) {
      console.error('Failed to fetch models:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (modelName: string) => {
    setDownloading(modelName);
    try {
      const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? window.location.host
        : '127.0.0.1:8000';

      await fetch(`http://${host}/api/models/download?model=${modelName}`, { method: 'POST' });
      await fetchModels();
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = async (modelName: string) => {
    if (!confirm(`Are you sure you want to delete the ${modelName} model?`)) return;

    try {
      const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? window.location.host
        : '127.0.0.1:8000';

      await fetch(`http://${host}/api/models/${modelName}`, { method: 'DELETE' });
      await fetchModels();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const getModelDescription = (name: string) => {
    const descriptions: Record<string, string> = {
      'tiny': '~75 MB - Fastest, least accurate',
      'base': '~150 MB - Good for testing',
      'small': '~500 MB - Best balance (default)',
      'medium': '~1.5 GB - More accurate',
      'large-v3': '~3 GB - Most accurate, slowest',
    };
    return descriptions[name] || '';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40"
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] max-w-[90vw] max-h-[85vh] flex flex-col bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-xl z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)] shrink-0 bg-[var(--card)]">
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-[var(--accent)]" />
                <h2 className="text-lg font-semibold text-[var(--foreground)]">Manage Models</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-[var(--button-secondary-hover)] rounded-full transition-colors"
              >
                <X size={20} className="text-[var(--foreground-secondary)]" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 min-h-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin text-[var(--accent)]" size={24} />
                </div>
              ) : (
                <div className="space-y-3">
                  {models.map((model) => {
                    const isActive = currentModel === model.name || currentChatModel === model.name;
                    return (
                    <div
                      key={model.name}
                      className={cn(
                        'flex items-center justify-between p-4 rounded-lg border',
                        isActive
                          ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                          : 'border-[var(--border)]'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {model.downloaded ? (
                          <CheckCircle size={20} className="text-[var(--success)] shrink-0" />
                        ) : (
                          <Circle size={20} className="text-[var(--foreground-tertiary)] shrink-0" />
                        )}
                        <div>
                          <p className="font-medium text-[var(--foreground)]">{model.name}</p>
                          <p className="text-sm text-[var(--foreground-tertiary)]">
                            {model.type === 'chat' ? 'AI Assistant Model' : getModelDescription(model.name)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {model.downloaded ? (
                          <>
                            {isActive && (
                              <span className="text-xs px-2 py-1 rounded bg-[var(--accent)] text-white">
                                Active
                              </span>
                            )}
                            <button
                              onClick={() => handleDelete(model.name)}
                              className="p-2 hover:bg-[var(--error)]/10 hover:text-[var(--error)] rounded transition-colors"
                              title="Delete model"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleDownload(model.name)}
                            disabled={downloading === model.name}
                            className="flex items-center gap-2 px-3 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm rounded transition-colors disabled:opacity-50"
                          >
                            {downloading === model.name ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                Downloading
                              </>
                            ) : (
                              <>
                                <Download size={14} />
                                Download
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  )})}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[var(--border)] shrink-0">
              <p className="text-xs text-[var(--foreground-tertiary)] text-center">
                Models are downloaded to your local machine. Delete unused models to save disk space.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}