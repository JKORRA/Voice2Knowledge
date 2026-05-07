import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, FileText, Trash2, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface Transcription {
  id: number;
  session_id: string;
  filename: string;
  file_path: string;
  text_content: string;
  vtt_path: string;
  model_size: string;
  language: string;
  device: string;
  duration_seconds: number | null;
  created_at: string;
}

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTranscription: (transcription: Transcription) => void;
}

export function HistoryPanel({ isOpen, onClose, onSelectTranscription }: HistoryPanelProps) {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);

  const limit = 20;

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, search, offset]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? window.location.host
        : '127.0.0.1:8000';

      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });
      if (search) params.set('search', search);

      const res = await fetch(`http://${host}/api/history?${params}`);
      const data = await res.json();
      setTranscriptions(data.transcriptions);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this transcription?')) return;

    try {
      const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? window.location.host
        : '127.0.0.1:8000';

      await fetch(`http://${host}/api/history/${id}`, { method: 'DELETE' });
      fetchHistory();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM d, yyyy HH:mm');
    } catch {
      return dateStr;
    }
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
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-96 bg-[var(--card)] border-l border-[var(--border)] z-50 flex flex-col shadow-xl"
          >
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Clock size={20} className="text-[var(--accent)]" />
                <h2 className="text-lg font-semibold text-[var(--foreground)]">History</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-[var(--button-secondary-hover)] rounded-full transition-colors"
              >
                <X size={20} className="text-[var(--foreground-secondary)]" />
              </button>
            </div>

            <div className="p-4 border-b border-[var(--border)]">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-tertiary)]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
                  placeholder="Search transcriptions..."
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--background-secondary)] text-[var(--foreground)] text-sm focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin text-[var(--accent)]" size={24} />
                </div>
              ) : transcriptions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-[var(--foreground-tertiary)]">
                  <FileText size={48} className="mb-4 opacity-50" />
                  <p>No transcriptions yet</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {transcriptions.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => onSelectTranscription(t)}
                      className="p-4 hover:bg-[var(--background-secondary)] cursor-pointer transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[var(--foreground)] truncate">
                            {t.filename}
                          </p>
                          <p className="text-sm text-[var(--foreground-tertiary)]">
                            {formatDate(t.created_at)}
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDelete(t.id, e)}
                          className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-[var(--error)]/10 hover:text-[var(--error)] rounded transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <p className="text-sm text-[var(--foreground-secondary)] mt-1 line-clamp-2">
                        {t.text_content?.substring(0, 150)}...
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-[var(--foreground-tertiary)]">
                        <span>{t.model_size}</span>
                        <span>{t.language}</span>
                        <span>{formatDuration(t.duration_seconds)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {total > limit && (
              <div className="p-4 border-t border-[var(--border)] flex items-center justify-between">
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="px-3 py-1.5 text-sm rounded border border-[var(--border)] hover:bg-[var(--button-secondary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-[var(--foreground-tertiary)]">
                  {offset + 1}-{Math.min(offset + limit, total)} of {total}
                </span>
                <button
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + limit >= total}
                  className="px-3 py-1.5 text-sm rounded border border-[var(--border)] hover:bg-[var(--button-secondary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}