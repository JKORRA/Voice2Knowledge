import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, Cpu, HardDrive, Sparkles, Database, Moon, Sun, Cloud, Globe, Key, Check, Loader2, AlertCircle, Plus, Trash2 } from 'lucide-react';
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

  // Verification State
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [verificationMessage, setVerificationMessage] = useState('');

  // External Model Add State
  const [isAddingModel, setIsAddingModel] = useState(false);
  const [newExternalApiBaseUrl, setNewExternalApiBaseUrl] = useState('');
  const [newExternalApiKey, setNewExternalApiKey] = useState('');
  const [newExternalApiModel, setNewExternalApiModel] = useState('');

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
      setVerificationStatus('idle');
      setVerificationMessage('');
    }
  }, [isOpen]);

  const verifyAndSaveExternalModel = async () => {
    if (!newExternalApiKey || !newExternalApiModel) {
      setVerificationStatus('error');
      setVerificationMessage('API Key and Model Name are required.');
      return;
    }

    setIsVerifying(true);
    setVerificationStatus('idle');
    setVerificationMessage('');

    try {
      const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? window.location.host
        : '127.0.0.1:8000';
        
      const res = await fetch(`http://${host}/api/verify-external-api`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: newExternalApiKey,
          model_name: newExternalApiModel,
          base_url: newExternalApiBaseUrl
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setVerificationStatus('success');
        setVerificationMessage('Model verified and saved successfully!');
        
        const newModel = {
          id: Math.random().toString(36).substring(7),
          name: newExternalApiModel,
          apiKey: newExternalApiKey,
          baseUrl: newExternalApiBaseUrl || undefined
        };
        
        onSettingsChange({
          externalModels: [...(settings.externalModels || []), newModel],
          selectedExternalModelId: newModel.id
        });
        
        setIsAddingModel(false);
        setNewExternalApiBaseUrl('');
        setNewExternalApiKey('');
        setNewExternalApiModel('');
        
        // Hide success message after a bit
        setTimeout(() => setVerificationStatus('idle'), 3000);
      } else {
        setVerificationStatus('error');
        setVerificationMessage(data.detail || 'Verification failed.');
      }
    } catch (err) {
      setVerificationStatus('error');
      setVerificationMessage('Failed to reach the server.');
    } finally {
      setIsVerifying(false);
    }
  };

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

                <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-xl border border-[var(--glass-border)]">
                  <button
                    onClick={() => onSettingsChange({ chatProvider: 'local' })}
                    className={`flex-1 text-xs font-medium py-2 rounded-lg transition-colors ${
                      settings.chatProvider === 'local' 
                        ? 'bg-[var(--background)] shadow-sm text-[var(--foreground)]' 
                        : 'text-[var(--foreground-secondary)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    Local Model
                  </button>
                  <button
                    onClick={() => onSettingsChange({ chatProvider: 'external' })}
                    className={`flex-1 text-xs font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                      settings.chatProvider === 'external' 
                        ? 'bg-[var(--background)] shadow-sm text-[var(--foreground)]' 
                        : 'text-[var(--foreground-secondary)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    <Cloud size={12} /> External API
                  </button>
                </div>

                {settings.chatProvider === 'local' ? (
                  <CustomSelect
                    value={settings.chatModel}
                    onChange={(val) => handleModelChange(val, 'chat')}
                    options={chatModelOptions}
                    disabled={isDisabled}
                  />
                ) : (
                  <div className="space-y-3">
                    {(!settings.externalModels || settings.externalModels.length === 0 || isAddingModel) ? (
                      <div className="space-y-3 p-3 bg-black/5 dark:bg-white/5 rounded-xl border border-[var(--glass-border)]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-[var(--foreground)]">Add New Model</span>
                          {(settings.externalModels && settings.externalModels.length > 0) && (
                            <button onClick={() => setIsAddingModel(false)} className="text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors">
                              <X size={16} />
                            </button>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-[var(--foreground-secondary)] flex items-center gap-1.5">
                            <Globe size={12} /> Base URL (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="https://api.openai.com/v1"
                            value={newExternalApiBaseUrl}
                            onChange={(e) => setNewExternalApiBaseUrl(e.target.value)}
                            disabled={isDisabled}
                            className="w-full bg-[var(--background)] border border-[var(--glass-border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] transition-colors placeholder:text-[var(--foreground-tertiary)]"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-[var(--foreground-secondary)] flex items-center gap-1.5">
                            <Key size={12} /> API Key
                          </label>
                          <input
                            type="password"
                            placeholder="sk-..."
                            value={newExternalApiKey}
                            onChange={(e) => setNewExternalApiKey(e.target.value)}
                            disabled={isDisabled}
                            className="w-full bg-[var(--background)] border border-[var(--glass-border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] transition-colors placeholder:text-[var(--foreground-tertiary)]"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-[var(--foreground-secondary)] flex items-center gap-1.5">
                            <Sparkles size={12} /> Model Name
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. gpt-4o or gemini/gemini-1.5-pro"
                            value={newExternalApiModel}
                            onChange={(e) => setNewExternalApiModel(e.target.value)}
                            disabled={isDisabled}
                            className="w-full bg-[var(--background)] border border-[var(--glass-border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] transition-colors placeholder:text-[var(--foreground-tertiary)]"
                          />
                        </div>
                        <div className="pt-2">
                          <button
                            onClick={verifyAndSaveExternalModel}
                            disabled={isVerifying || isDisabled}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--glass-border)] text-xs font-medium text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isVerifying ? (
                              <><Loader2 size={12} className="animate-spin" /> Verifying...</>
                            ) : (
                              <><Check size={12} /> Verify & Save Model</>
                            )}
                          </button>
                        </div>
                        {verificationStatus !== 'idle' && (
                          <div className={`p-2 rounded-lg text-xs font-medium flex items-start gap-1.5 ${verificationStatus === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-[var(--error)]/10 text-[var(--error)] border border-[var(--error)]/20'}`}>
                            {verificationStatus === 'success' ? <Check size={14} className="shrink-0 mt-0.5" /> : <AlertCircle size={14} className="shrink-0 mt-0.5" />}
                            <span className="leading-snug break-all">{verificationMessage}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="flex gap-2">
                          <div className="flex-1 min-w-0">
                            <CustomSelect
                              value={settings.selectedExternalModelId || ''}
                              onChange={(val) => onSettingsChange({ selectedExternalModelId: val })}
                              options={(settings.externalModels || []).map(m => ({
                                value: m.id,
                                label: m.name,
                                description: m.baseUrl || 'Standard API'
                              }))}
                              disabled={isDisabled}
                            />
                          </div>
                          <button
                            onClick={() => {
                              const newModels = (settings.externalModels || []).filter(m => m.id !== settings.selectedExternalModelId);
                              onSettingsChange({
                                externalModels: newModels,
                                selectedExternalModelId: newModels.length > 0 ? newModels[0].id : null
                              });
                            }}
                            className="p-3 shrink-0 rounded-lg border border-[var(--glass-border)] bg-black/5 dark:bg-white/5 hover:bg-[var(--error)]/10 hover:text-[var(--error)] hover:border-[var(--error)]/20 text-[var(--foreground-secondary)] transition-colors"
                            title="Delete Selected Model"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <button
                          onClick={() => setIsAddingModel(true)}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-[var(--glass-border)] text-xs font-medium text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all bg-black/5 dark:bg-white/5"
                        >
                          <Plus size={14} /> Add New Model
                        </button>
                      </>
                    )}
                  </div>
                )}
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