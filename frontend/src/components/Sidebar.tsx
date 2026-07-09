import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Plus, Settings, MessageSquare, Trash2, Pencil, PanelLeftClose, MoreVertical } from 'lucide-react';
import { useChatStore } from '../stores/chatStore';
import { cn } from '../lib/utils';
import { RenameModal } from './RenameModal';
import { ConfirmModal } from './ConfirmModal';

interface Session {
  id: number;
  session_id: string;
  title: string;
  transcription_count: number;
  chat_count: number;
  created_at: string;
  updated_at: string;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onLoadSession: (sessionId: string) => void;
  currentSessionId: string | null;
  onSettingsClick: () => void;
}

export function Sidebar({ isOpen, onClose, onNewChat, onLoadSession, currentSessionId, onSettingsClick }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [search] = useState('');
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  
  // Dropdown state
  const [activeDropdown, setActiveDropdown] = useState<{ id: string, title: string, top: number, left: number } | null>(null);
  
  // Rename Modal state
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameSessionId, setRenameSessionId] = useState<string | null>(null);
  const [initialRenameTitle, setInitialRenameTitle] = useState('');

  // Confirm Modal state
  const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean; sessionId: string | null }>({ isOpen: false, sessionId: null });

  const limit = 20;
  const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? window.location.host
    : '127.0.0.1:8000';

  const fetchSessions = async () => {
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (search) params.set('search', search);

      const res = await fetch(`http://${host}/api/sessions?${params}`);
      const data = await res.json();
      setSessions(data.sessions);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
  };

  useEffect(() => {
    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, offset, currentSessionId]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = () => {
      if (activeDropdown !== null) {
        setActiveDropdown(null);
      }
    };
    if (activeDropdown !== null) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeDropdown]);

  const confirmDelete = async () => {
    if (!confirmModalState.sessionId) return;
    try {
      await fetch(`http://${host}/api/sessions/${confirmModalState.sessionId}`, { method: 'DELETE' });
      if (confirmModalState.sessionId === currentSessionId) {
        useChatStore.getState().clearMessages();
        useChatStore.getState().setSessionId(null);
      }
      fetchSessions();
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
    setConfirmModalState({ isOpen: false, sessionId: null });
  };

  const handleSaveRename = async (newTitle: string) => {
    if (!renameSessionId) return;
    try {
      await fetch(`http://${host}/api/sessions/${renameSessionId}?title=${encodeURIComponent(newTitle)}`, { method: 'PATCH' });
      setSessions(prev => prev.map(s => s.session_id === renameSessionId ? { ...s, title: newTitle } : s));
    } catch (err) {
      console.error('Failed to update title:', err);
    }
    setIsRenameModalOpen(false);
    setRenameSessionId(null);
  };

  return (
    <>
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        title="Delete Chat"
        message="Are you sure you want to delete this chat? This action cannot be undone."
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmModalState({ isOpen: false, sessionId: null })}
      />

      <RenameModal
        isOpen={isRenameModalOpen}
        initialTitle={initialRenameTitle}
        onClose={() => setIsRenameModalOpen(false)}
        onSave={handleSaveRename}
      />

      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="md:hidden fixed inset-0 bg-black/20 dark:bg-black/40 z-40"
          />
        )}
      </AnimatePresence>

      <motion.aside
        animate={{
          width: isCollapsed ? 80 : 320,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={cn(
          "fixed md:relative top-0 bottom-0 left-0 z-50 flex flex-col glass-panel border-y-0 border-l-0 border-r",
          "transition-transform duration-300 ease-in-out md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full overflow-hidden bg-white/5 dark:bg-black/5">
          {/* Header */}
          <div className="p-4 flex flex-col gap-4 shrink-0">
            <div className={cn("flex items-center h-10", isCollapsed ? "justify-center" : "justify-between")}>
              <AnimatePresence mode="popLayout">
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex items-center gap-2 overflow-hidden whitespace-nowrap"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center shrink-0">
                      <Bot size={18} className="text-white" />
                    </div>
                    <span className="font-semibold text-lg text-[var(--foreground)]">
                      Voice2Knowledge
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-2 w-10 h-10 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors shrink-0 flex items-center justify-center"
              >
                <PanelLeftClose size={20} className={cn("text-[var(--foreground-secondary)] transition-transform duration-300", isCollapsed ? "rotate-180" : "rotate-0")} />
              </button>
            </div>

            <button
              onClick={() => {
                onNewChat();
                if (window.innerWidth < 768) onClose();
              }}
              className={cn(
                "flex items-center gap-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[var(--foreground)] rounded-full transition-all border border-[var(--glass-border)] h-10",
                isCollapsed ? "justify-center w-10 mx-auto" : "px-4"
              )}
              title="New Chat"
            >
              <Plus size={20} className="shrink-0" />
              <AnimatePresence mode="popLayout">
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="font-medium whitespace-nowrap overflow-hidden"
                  >
                    New Chat
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>

          {/* History Section */}
          <div className="flex-1 overflow-y-auto flex flex-col mt-4 relative">
            <AnimatePresence mode="popLayout">
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-4 pb-2"
                >
                  <h3 className="text-xs font-semibold text-[var(--foreground-tertiary)] uppercase tracking-wider mb-2">Recent</h3>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="popLayout">
              {(!isCollapsed && sessions.length > 0) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 overflow-y-auto"
                >
                  <div className="space-y-1 px-2 pb-20">
                    {sessions.map((s) => (
                      <div
                        key={s.session_id}
                        onClick={() => {
                          onLoadSession(s.session_id);
                          if (window.innerWidth < 768) onClose();
                        }}
                        className={cn(
                          "relative flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors group",
                          currentSessionId === s.session_id 
                            ? "bg-[var(--accent)]/10 text-[var(--accent)]" 
                            : "hover:bg-black/5 dark:hover:bg-white/5 text-[var(--foreground)]"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <MessageSquare size={16} className={cn(
                            "shrink-0",
                            currentSessionId === s.session_id ? "text-[var(--accent)]" : "text-[var(--foreground-tertiary)]"
                          )} />
                          <p className="text-sm font-medium truncate flex-1">
                            {s.title}
                          </p>
                        </div>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (activeDropdown?.id === s.session_id) {
                              setActiveDropdown(null);
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setActiveDropdown({
                                id: s.session_id,
                                title: s.title,
                                top: rect.top,
                                left: rect.right + 8
                              });
                            }
                          }}
                          className={cn(
                            "p-1.5 rounded-full transition-all shrink-0",
                            activeDropdown?.id === s.session_id 
                              ? "opacity-100 bg-black/10 dark:bg-white/10" 
                              : "opacity-0 group-hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10"
                          )}
                        >
                          <MoreVertical size={16} className="text-[var(--foreground-secondary)]" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {total > limit && (
                    <div className="p-4 flex items-center justify-between">
                      <button
                        onClick={() => setOffset(Math.max(0, offset - limit))}
                        disabled={offset === 0}
                        className="p-1.5 text-xs rounded hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-50"
                      >
                        Prev
                      </button>
                      <button
                        onClick={() => setOffset(offset + limit)}
                        disabled={offset + limit >= total}
                        className="p-1.5 text-xs rounded hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Settings */}
          <div className="p-4 shrink-0 bg-gradient-to-t from-white/5 to-transparent dark:from-black/5">
            <button
              onClick={() => {
                onSettingsClick();
                if (window.innerWidth < 768) onClose();
              }}
              className={cn(
                "flex items-center gap-3 w-full hover:bg-black/5 dark:hover:bg-white/5 text-[var(--foreground)] rounded-xl transition-all h-10",
                isCollapsed ? "justify-center" : "px-3"
              )}
              title="Settings"
            >
              <Settings size={20} className="shrink-0 text-[var(--foreground-secondary)]" />
              <AnimatePresence mode="popLayout">
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="font-medium whitespace-nowrap overflow-hidden text-sm"
                  >
                    Settings
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Portal for Dropdown Menu */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {activeDropdown && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, transformOrigin: 'left top' }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'fixed',
                top: activeDropdown.top,
                left: activeDropdown.left,
              }}
              className="w-56 py-2 rounded-xl bg-[var(--card-elevated)] border border-[var(--glass-border)] shadow-2xl z-[100] overflow-hidden"
            >
              <button
                onClick={() => {
                  setRenameSessionId(activeDropdown.id);
                  setInitialRenameTitle(activeDropdown.title);
                  setIsRenameModalOpen(true);
                  setActiveDropdown(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <Pencil size={16} className="text-[var(--foreground-secondary)]" />
                Rename
              </button>
              <button
                onClick={() => {
                  setConfirmModalState({ isOpen: true, sessionId: activeDropdown.id });
                  setActiveDropdown(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-[var(--error)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <Trash2 size={16} className="text-[var(--error)]" />
                Delete
              </button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
