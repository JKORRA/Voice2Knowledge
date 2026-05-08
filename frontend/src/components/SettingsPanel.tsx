import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, Cpu, HardDrive, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import type { Settings as SettingsType } from '../types';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SettingsType;
  onSettingsChange: (settings: Partial<SettingsType>) => void;
  isDisabled?: boolean;
}

const modelOptions = [
  { value: 'tiny', label: 'Tiny', description: 'Fastest, less accurate' },
  { value: 'base', label: 'Base', description: 'Balanced' },
  { value: 'small', label: 'Small', description: 'Recommended (default)' },
  { value: 'medium', label: 'Medium', description: 'More accurate' },
  { value: 'large-v3', label: 'Large v3', description: 'Most accurate, slowest' },
];

const chatModelOptions = [
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
}: SettingsPanelProps) {
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
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 bottom-0 w-80 bg-[var(--card)] border-r border-[var(--border)] z-50 flex flex-col shadow-xl"
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
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                  <Sparkles size={16} className="text-[var(--accent)]" />
                  Transcription Model (Whisper)
                </div>
                <select
                  value={settings.model}
                  onChange={(e) => onSettingsChange({ model: e.target.value })}
                  disabled={isDisabled}
                  className={cn(
                    'w-full p-3 rounded-lg border border-[var(--border)] bg-[var(--background-secondary)] text-[var(--foreground)] text-sm',
                    'focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-colors',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {modelOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} - {opt.description}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                  <Sparkles size={16} className="text-[var(--accent)]" />
                  Chat Model (Generative AI)
                </div>
                <select
                  value={settings.chatModel}
                  onChange={(e) => onSettingsChange({ chatModel: e.target.value })}
                  disabled={isDisabled}
                  className={cn(
                    'w-full p-3 rounded-lg border border-[var(--border)] bg-[var(--background-secondary)] text-[var(--foreground)] text-sm',
                    'focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-colors',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {chatModelOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} - {opt.description}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                  <Cpu size={16} className="text-[var(--accent)]" />
                  Device
                </div>
                <select
                  value={settings.device}
                  onChange={(e) => onSettingsChange({ device: e.target.value })}
                  disabled={isDisabled}
                  className={cn(
                    'w-full p-3 rounded-lg border border-[var(--border)] bg-[var(--background-secondary)] text-[var(--foreground)] text-sm',
                    'focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-colors',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {deviceOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} - {opt.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-4 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)]">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)] mb-2">
                  <HardDrive size={16} className="text-[var(--foreground-secondary)]" />
                  <span>Compute Type</span>
                </div>
                <p className="text-xs text-[var(--foreground-tertiary)]">
                  Auto-detected based on device. CPU uses int8, GPU uses float16 for optimal performance.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-[var(--border)]">
              <p className="text-xs text-[var(--foreground-tertiary)] text-center">
                Changes apply to next transcription
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}