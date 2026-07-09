import { useState, useEffect } from 'react';
import { Cpu, HardDrive, Sparkles, Database, Moon, Sun, Cloud, Globe, Key, Check, Loader2, AlertCircle, Plus, Trash2, ArrowLeft, X } from 'lucide-react';
import { cn } from '../lib/utils';
import type { Settings as SettingsType } from '../types';
import { DownloadConfirmModal } from './DownloadConfirmModal';
import { ModelManager } from './ModelManager';
import { CustomSelect } from './CustomSelect';

interface SettingsScreenProps {
  onClose: () => void;
  settings: SettingsType;
  onSettingsChange: (settings: Partial<SettingsType>) => void;
  isDisabled?: boolean;
  resolvedTheme: 'light' | 'dark';
  onThemeToggle: () => void;
}

const baseModelOptions = [
  { value: 'tiny', label: 'Tiny', description: 'Fastest (Recommended default)' },
  { value: 'base', label: 'Base', description: 'Fast, slightly better accuracy' },
  { value: 'small', label: 'Small', description: 'Balanced speed and accuracy' },
  { value: 'medium', label: 'Medium', description: 'High accuracy, slower' },
  { value: 'large-v3', label: 'Large v3', description: 'State-of-the-art accuracy' },
];

const baseChatModelOptions = [
  { value: 'qwen3.5-2b', label: 'Qwen 3.5 2B', description: 'Best for standard laptops' },
  { value: 'qwen3.5-4b', label: 'Qwen 3.5 4B', description: 'Strong reasoning, requires good RAM' },
  { value: 'qwen3.5-9b', label: 'Qwen 3.5 9B', description: 'Premium logic, for high-end machines' },
];

const deviceOptions = [
  { value: 'auto', label: 'Auto', description: 'CUDA if available' },
  { value: 'cpu', label: 'CPU', description: 'No GPU required' },
  { value: 'cuda', label: 'CUDA', description: 'NVIDIA GPU' },
];

export function SettingsScreen({
  onClose,
  settings,
  onSettingsChange,
  isDisabled = false,
  resolvedTheme,
  onThemeToggle,
}: SettingsScreenProps) {
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
    fetchStatuses();
    setVerificationStatus('idle');
    setVerificationMessage('');
  }, []);

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

      <div className="flex-1 w-full h-full overflow-y-auto p-4 md:p-8 bg-transparent">
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
          
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={onClose}
              className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors flex items-center justify-center -ml-2"
              title="Back to Chat"
            >
              <ArrowLeft size={20} className="text-[var(--foreground)]" />
            </button>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">Settings</h2>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl shadow-sm space-y-8">
            {/* Appearance Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[var(--foreground)] border-b border-[var(--border)] pb-2">Appearance</h3>
              <div className="p-4 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--glass-border)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[var(--background)] rounded-lg shadow-sm border border-[var(--glass-border)]">
                    {resolvedTheme === 'light' ? <Sun size={20} className="text-amber-500" /> : <Moon size={20} className="text-[var(--accent)]" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-[var(--foreground)]">Theme</span>
                    <span className="text-xs text-[var(--foreground-tertiary)]">{resolvedTheme === 'light' ? 'Light Mode' : 'Dark Mode'}</span>
                  </div>
                </div>
                <button
                  onClick={onThemeToggle}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors outline-none",
                    resolvedTheme === 'dark' ? 'bg-[var(--accent)]' : 'bg-black/20 dark:bg-white/20'
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out shadow-sm",
                      resolvedTheme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>
            </div>

            {/* Models Section */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-[var(--foreground)] border-b border-[var(--border)] pb-2 flex items-center justify-between">
                <span>AI Models</span>
                <button
                  onClick={() => setIsModelManagerOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--glass-border)] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[var(--foreground)] text-xs font-medium transition-colors"
                >
                  <Database size={14} className="text-[var(--accent)]" />
                  Manage Local Models
                </button>
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                  <Sparkles size={18} className="text-[var(--accent)]" />
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
                  <Sparkles size={18} className="text-[var(--accent)]" />
                  Chat Model (Generative AI)
                </div>

                <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-xl border border-[var(--glass-border)]">
                  <button
                    onClick={() => onSettingsChange({ chatProvider: 'local' })}
                    className={`flex-1 text-sm font-medium py-2.5 rounded-lg transition-colors ${
                      settings.chatProvider === 'local' 
                        ? 'bg-[var(--background)] shadow-sm text-[var(--foreground)]' 
                        : 'text-[var(--foreground-secondary)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    Local Model
                  </button>
                  <button
                    onClick={() => onSettingsChange({ chatProvider: 'external' })}
                    className={`flex-1 text-sm font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                      settings.chatProvider === 'external' 
                        ? 'bg-[var(--background)] shadow-sm text-[var(--foreground)]' 
                        : 'text-[var(--foreground-secondary)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    <Cloud size={16} /> External API
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
                  <div className="space-y-4">
                    {(!settings.externalModels || settings.externalModels.length === 0 || isAddingModel) ? (
                      <div className="space-y-4 p-5 bg-black/5 dark:bg-white/5 rounded-xl border border-[var(--glass-border)]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-[var(--foreground)]">Add New External Model</span>
                          {(settings.externalModels && settings.externalModels.length > 0) && (
                            <button onClick={() => setIsAddingModel(false)} className="text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors">
                              <X size={18} /> {/* Note: The import X is gone, I will add it back or remove it. Wait, I should import X */}
                            </button>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-[var(--foreground-secondary)] flex items-center gap-2">
                            <Globe size={14} /> Base URL (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="https://api.openai.com/v1"
                            value={newExternalApiBaseUrl}
                            onChange={(e) => setNewExternalApiBaseUrl(e.target.value)}
                            disabled={isDisabled}
                            className="w-full bg-[var(--background)] border border-[var(--glass-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] transition-colors placeholder:text-[var(--foreground-tertiary)]"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-[var(--foreground-secondary)] flex items-center gap-2">
                            <Key size={14} /> API Key
                          </label>
                          <input
                            type="password"
                            placeholder="sk-..."
                            value={newExternalApiKey}
                            onChange={(e) => setNewExternalApiKey(e.target.value)}
                            disabled={isDisabled}
                            className="w-full bg-[var(--background)] border border-[var(--glass-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] transition-colors placeholder:text-[var(--foreground-tertiary)]"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-[var(--foreground-secondary)] flex items-center gap-2">
                            <Sparkles size={14} /> Model Name
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. gpt-4o or gemini/gemini-1.5-pro"
                            value={newExternalApiModel}
                            onChange={(e) => setNewExternalApiModel(e.target.value)}
                            disabled={isDisabled}
                            className="w-full bg-[var(--background)] border border-[var(--glass-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] transition-colors placeholder:text-[var(--foreground-tertiary)]"
                          />
                        </div>
                        <div className="pt-4">
                          <button
                            onClick={verifyAndSaveExternalModel}
                            disabled={isVerifying || isDisabled}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent-hover)] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                          >
                            {isVerifying ? (
                              <><Loader2 size={16} className="animate-spin" /> Verifying...</>
                            ) : (
                              <><Check size={16} /> Verify & Save Model</>
                            )}
                          </button>
                        </div>
                        {verificationStatus !== 'idle' && (
                          <div className={`p-3 rounded-lg text-sm font-medium flex items-start gap-2 ${verificationStatus === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-[var(--error)]/10 text-[var(--error)] border border-[var(--error)]/20'}`}>
                            {verificationStatus === 'success' ? <Check size={16} className="shrink-0 mt-0.5" /> : <AlertCircle size={16} className="shrink-0 mt-0.5" />}
                            <span className="leading-snug break-all">{verificationMessage}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="flex gap-3">
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
                            className="p-3.5 shrink-0 rounded-xl border border-[var(--glass-border)] bg-black/5 dark:bg-white/5 hover:bg-[var(--error)]/10 hover:text-[var(--error)] hover:border-[var(--error)]/20 text-[var(--foreground-secondary)] transition-colors shadow-sm"
                            title="Delete Selected Model"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                        <button
                          onClick={() => setIsAddingModel(true)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-[var(--glass-border)] text-sm font-medium text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all bg-black/5 dark:bg-white/5 shadow-sm"
                        >
                          <Plus size={18} /> Add New External Model
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Hardware Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[var(--foreground)] border-b border-[var(--border)] pb-2">Hardware Acceleration</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                  <Cpu size={18} className="text-[var(--accent)]" />
                  Compute Device
                </div>
                <CustomSelect
                  value={settings.device}
                  onChange={(val) => onSettingsChange({ device: val })}
                  options={deviceOptions}
                  disabled={isDisabled}
                />
              </div>

              <div className="p-4 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--glass-border)] backdrop-blur-sm mt-4">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)] mb-2">
                  <HardDrive size={18} className="text-[var(--foreground-secondary)]" />
                  <span>Compute Details</span>
                </div>
                <p className="text-sm text-[var(--foreground-tertiary)]">
                  The system will automatically select the best compute type based on your device. CPU inference uses `int8` quantization for speed, while GPU uses `float16` for optimal performance.
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
      
      <ModelManager
        isOpen={isModelManagerOpen}
        onClose={() => setIsModelManagerOpen(false)}
        currentModel={settings.model}
        currentChatModel={settings.chatModel}
      />
    </>
  );
}