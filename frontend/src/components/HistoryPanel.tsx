import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Clock, Loader2, MessageSquare, FileText, Trash2, Pencil, Check, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useChatStore } from '../stores/chatStore';

interface Session {
  id: number;
  session_id: string;
  title: string;
  transcription_count: number;
  chat_count: number;
  created_at: string;
  updated_at: string;
}

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadSession: (sessionId: string) => void;
  currentSessionId: string | null;
}

export function HistoryPanel({ isOpen, onClose, onLoadSession, currentSessionId }: HistoryPanelProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const limit = 20;

  const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? window.location.host
    : '127.0.0.1:8000';

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (search) params.set('search', search);

      const res = await fetch(`http://${host}/api/sessions?${params}`);
      const data = await res.json();
      setSessions(data.sessions);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(fetchSessions, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, search, offset]);

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this session and all its data?')) return;
    try {
      await fetch(`http://${host}/api/sessions/${sessionId}`, { method: 'DELETE' });
      if (sessionId === currentSessionId) {
        useChatStore.getState().clearMessages();
        useChatStore.getState().setSessionId(null);
      }
      fetchSessions();
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const handleStartEdit = (session: Session, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(session.session_id);
    setEditTitle(session.title);
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const handleSaveTitle = async (sessionId: string) => {
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }
    try {
      await fetch(`http://${host}/api/sessions/${sessionId}?title=${encodeURIComponent(editTitle.trim())}`, { method: 'PATCH' });
      setSessions(prev => prev.map(s => s.session_id === sessionId ? { ...s, title: editTitle.trim() } : s));
    } catch (err) {
      console.error('Failed to update title:', err);
    }
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, sessionId: string) => {
    if (e.key === 'Enter') handleSaveTitle(sessionId);
    if (e.key === 'Escape') handleCancelEdit();
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
                  placeholder="Search sessions..."
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--background-secondary)] text-[var(--foreground)] text-sm focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin text-[var(--accent)]" size={24} />
                </div>
              ) : sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-[var(--foreground-tertiary)]">
                  <Clock size={48} className="mb-4 opacity-50" />
                  <p>No sessions yet</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {sessions.map((s) => (
                    <div
                      key={s.session_id}
                      onClick={() => { onLoadSession(s.session_id); onClose(); }}
                      className="p-4 hover:bg-[var(--background-secondary)] cursor-pointer transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {editingId === s.session_id ? (
                            <div className="flex items-center gap-1">
                              <input
                                ref={editInputRef}
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, s.session_id)}
                                className="flex-1 px-2 py-0.5 text-sm rounded border border-[var(--accent)] bg-[var(--background)] text-[var(--foreground)] outline-none"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <button onClick={(e) => { e.stopPropagation(); handleSaveTitle(s.session_id); }} className="p-1 text-[var(--success)] hover:bg-[var(--success)]/10 rounded">
                                <Check size={14} />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleCancelEdit(); }} className="p-1 text-[var(--error)] hover:bg-[var(--error)]/10 rounded">
                                <XCircle size={14} />
                              </button>
                            </div>
                          ) : (
                            <p className="font-medium text-[var(--foreground)] truncate flex items-center gap-1">
                              {s.title}
                              <button
                                onClick={(e) => handleStartEdit(s, e)}
                                className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-[var(--button-secondary-hover)] rounded transition-opacity"
                              >
                                <Pencil size={12} className="text-[var(--foreground-tertiary)]" />
                              </button>
                            </p>
                          )}
                          <p className="text-sm text-[var(--foreground-tertiary)] mt-0.5">
                            {formatDate(s.updated_at)}
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDelete(s.session_id, e)}
                          className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-[var(--error)]/10 hover:text-[var(--error)] rounded transition-all shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-[var(--foreground-tertiary)]">
                        {s.transcription_count > 0 && (
                          <span className="flex items-center gap-1">
                            <FileText size={12} />
                            {s.transcription_count} {s.transcription_count === 1 ? 'file' : 'files'}
                          </span>
                        )}
                        {s.chat_count > 0 && (
                          <span className="flex items-center gap-1">
                            <MessageSquare size={12} />
                            {s.chat_count} {s.chat_count === 1 ? 'message' : 'messages'}
                          </span>
                        )}
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
