import { useState, useEffect, startTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Trash2, Sparkles, Loader2, CheckCircle, Circle, Mic, MessageSquare } from 'lucide-react';
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

  useEffect(() => {
    if (isOpen) {
      startTransition(() => {
        fetchModels();
      });
    }
  }, [isOpen]);

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
      'qwen2.5-3b': 'Tiny, Smart, Fast',
      'llama-3.2-1b': 'Small, Fast',
      'phi-3.5-mini': 'Balanced',
    };
    return descriptions[name] || '';
  };

  const whisperModels = models.filter(m => m.type !== 'chat');
  const chatModels = models.filter(m => m.type === 'chat');

  const ModelRow = ({ model }: { model: Model }) => {
    const isActive = currentModel === model.name || currentChatModel === model.name;
    
    return (
      <div
        className={cn(
          'flex items-center justify-between p-4 rounded-lg border transition-colors',
          isActive
            ? 'border-[var(--accent)] bg-[var(--accent)]/5'
            : 'border-[var(--border)] hover:border-[var(--foreground-tertiary)]'
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
              {getModelDescription(model.name)}
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
    );
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
            className="fixed inset-0 bg-black/20 dark:bg-black/60 z-[60]"
          />

          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-[550px] max-w-full max-h-full flex flex-col bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-xl overflow-hidden pointer-events-auto"
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

              <div className="p-4 overflow-y-auto flex-1 min-h-0 space-y-6">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="animate-spin text-[var(--accent)]" size={24} />
                  </div>
                ) : (
                  <>
                    {whisperModels.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 pb-2 mb-3 border-b border-[var(--border)]">
                           <Mic size={16} className="text-[var(--foreground-secondary)]" />
                           <h3 className="text-sm font-semibold text-[var(--foreground-secondary)] uppercase tracking-wider">Transcription (Whisper)</h3>
                        </div>
                        {whisperModels.map(model => (
                          <ModelRow key={model.name} model={model} />
                        ))}
                      </div>
                    )}

                    {chatModels.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 pb-2 mt-6 mb-3 border-b border-[var(--border)]">
                           <MessageSquare size={16} className="text-[var(--foreground-secondary)]" />
                           <h3 className="text-sm font-semibold text-[var(--foreground-secondary)] uppercase tracking-wider">Chat Assistant (LLM)</h3>
                        </div>
                        {chatModels.map(model => (
                          <ModelRow key={model.name} model={model} />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="p-4 border-t border-[var(--border)] shrink-0 bg-[var(--card)]">
                <p className="text-xs text-[var(--foreground-tertiary)] text-center">
                  Models are downloaded to your local machine. Delete unused models to save disk space.
                </p>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}