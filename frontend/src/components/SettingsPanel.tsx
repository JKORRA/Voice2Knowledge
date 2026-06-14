import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, Cpu, HardDrive, Sparkles, Database, Moon, Sun } from 'lucide-react';
import type { Settings as SettingsType } from '../types';
import { DownloadConfirmModal } from './DownloadConfirmModal';
import { ModelManager } from './ModelManager';
import { CustomSelect } from './CustomSelect';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SettingsType;
  onSettingsChange: (settings: Partial<SettingsType>) => void;
  isDisabled?: boolean;
  resolvedTheme: 'light' | 'dark';
  onThemeToggle: () => void;
}

const baseModelOptions = [
  { value: 'tiny', label: 'Tiny', description: 'Fastest, less accurate' },
  { value: 'base', label: 'Base', description: 'Balanced' },
  { value: 'small', label: 'Small', description: 'Recommended (default)' },
  { value: 'medium', label: 'Medium', description: 'More accurate' },
  { value: 'large-v3', label: 'Large v3', description: 'Most accurate, slowest' },
];

const baseChatModelOptions = [
  { value: 'qwen2.5-3b', label: 'Qwen 2.5 3B', description: 'Tiny, Smart, Fast' },
  { value: 'llama-3.2-1b', label: 'Llama 3.2 1B', description: 'Small, Fast' },
  { value: 'phi-3.5-mini', label: 'Phi 3.5 Mini', description: 'Balanced' },
];

const deviceOptions = [
  { value: 'auto', label: 'Auto', description: 'CUDA if available' },
  { value: 'cpu', label: 'CPU', description: 'No GPU required' },
  { value: 'cuda', label: 'CUDA', description: 'NVIDIA GPU' },
];

export function SettingsPanel({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
  isDisabled = false,
  resolvedTheme,
  onThemeToggle,
}: SettingsPanelProps) {
  const [modelStatuses, setModelStatuses] = useState<Record<string, boolean>>({});
  
  // Download Modal State
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [pendingModelDownload, setPendingModelDownload] = useState<{ name: string, type: 'whisper' | 'chat' } | null>(null);

  // Model Manager State
  const [isModelManagerOpen, setIsModelManagerOpen] = useState(false);

  const fetchStatuses = () => {
    const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? window.location.host
      : '127.0.0.1:8000';
      
    fetch(`http://${host}/api/models`)
      .then(res => res.json())
      .then(data => {
        const statuses: Record<string, boolean> = {};
        data.models.forEach((m: { name: string; downloaded: boolean }) => {
          statuses[m.name] = m.downloaded;
        });
        setModelStatuses(statuses);
      })
      .catch(err => console.error("Failed to fetch model statuses", err));
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatuses();
    }
  }, [isOpen]);

  const handleModelChange = (modelName: string, type: 'whisper' | 'chat') => {
    if (modelStatuses[modelName]) {
      // Already downloaded, just apply
      if (type === 'whisper') {
        onSettingsChange({ model: modelName });
      } else {
        onSettingsChange({ chatModel: modelName });
      }
    } else {
      // Not downloaded, prompt user
      setPendingModelDownload({ name: modelName, type });
      setIsDownloadModalOpen(true);
    }
  };

  const handleDownloadComplete = () => {
    if (pendingModelDownload) {
      if (pendingModelDownload.type === 'whisper') {
        onSettingsChange({ model: pendingModelDownload.name });
      } else {
        onSettingsChange({ chatModel: pendingModelDownload.name });
      }
    }
    fetchStatuses();
    setIsDownloadModalOpen(false);
    setPendingModelDownload(null);
  };

  const handleDownloadCancel = () => {
    setIsDownloadModalOpen(false);
    setPendingModelDownload(null);
    // Dropdown will automatically revert because it's bound to the unmodified `settings` prop.
  };

  const modelOptions = baseModelOptions.map(opt => ({
    ...opt,
    status: modelStatuses[opt.value] ? 'Downloaded' : 'Not downloaded'
  }));

  const chatModelOptions = baseChatModelOptions.map(opt => ({
    ...opt,
    status: modelStatuses[opt.value] ? 'Downloaded' : 'Not downloaded'
  }));

  return (
    <>
      <DownloadConfirmModal
        isOpen={isDownloadModalOpen}
        modelName={pendingModelDownload?.name || ''}
        modelType={pendingModelDownload?.type || 'whisper'}
        onConfirm={() => {}}
        onCancel={handleDownloadCancel}
        onComplete={handleDownloadComplete}
      />

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
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-4 top-4 bottom-4 w-80 rounded-2xl glass-panel-solid z-50 flex flex-col overflow-hidden border border-[var(--glass-border)]"
          >
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Settings size={20} className="text-[var(--accent)]" />
                <h2 className="text-lg font-semibold text-[var(--foreground)]">Settings</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-[var(--button-secondary-hover)] rounded-full transition-colors"
              >
                <X size={20} className="text-[var(--foreground-secondary)]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <div className="p-4 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--glass-border)] backdrop-blur-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[var(--background)] rounded-lg shadow-sm border border-[var(--glass-border)]">
                    {resolvedTheme === 'light' ? <Sun size={16} className="text-amber-500" /> : <Moon size={16} className="text-[var(--accent)]" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-[var(--foreground)]">Appearance</span>
                    <span className="text-xs text-[var(--foreground-tertiary)]">{resolvedTheme === 'light' ? 'Light Mode' : 'Dark Mode'}</span>
                  </div>
                </div>
                <button
                  onClick={onThemeToggle}
                  className="px-3 py-1.5 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 text-xs font-bold transition-colors"
                >
                  Toggle
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                  <Sparkles size={16} className="text-[var(--accent)]" />
                  Transcription Model (Whisper)
                </div>
                <CustomSelect
                  value={settings.model}
                  onChange={(val) => handleModelChange(val, 'whisper')}
                  options={modelOptions}
                  disabled={isDisabled}
                />
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                  <Sparkles size={16} className="text-[var(--accent)]" />
                  Chat Model (Generative AI)
                </div>
                <CustomSelect
                  value={settings.chatModel}
                  onChange={(val) => handleModelChange(val, 'chat')}
                  options={chatModelOptions}
                  disabled={isDisabled}
                />
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                  <Cpu size={16} className="text-[var(--accent)]" />
                  Device
                </div>
                <CustomSelect
                  value={settings.device}
                  onChange={(val) => onSettingsChange({ device: val })}
                  options={deviceOptions}
                  disabled={isDisabled}
                />
              </div>

              <div className="p-4 rounded-lg bg-black/5 dark:bg-white/5 border border-[var(--glass-border)] backdrop-blur-sm">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)] mb-2">
                  <HardDrive size={16} className="text-[var(--foreground-secondary)]" />
                  <span>Compute Type</span>
                </div>
                <p className="text-xs text-[var(--foreground-tertiary)]">
                  Auto-detected based on device. CPU uses int8, GPU uses float16 for optimal performance.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-white/10 flex flex-col gap-3">
              <button
                onClick={() => setIsModelManagerOpen(true)}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-[var(--glass-border)] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[var(--foreground)] text-sm font-medium transition-colors backdrop-blur-sm"
              >
                <Database size={16} className="text-[var(--accent)]" />
                Manage Local Models
              </button>
              <p className="text-xs text-[var(--foreground-tertiary)] text-center">
                Changes apply to next transcription
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    <ModelManager
      isOpen={isModelManagerOpen}
      onClose={() => setIsModelManagerOpen(false)}
      currentModel={settings.model}
      currentChatModel={settings.chatModel}
    />
    </>
  );
}