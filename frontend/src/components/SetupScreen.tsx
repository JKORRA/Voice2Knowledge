import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, Bot, Mic } from 'lucide-react';
import { CustomSelect } from './CustomSelect';
import { useChatStore } from '../stores/chatStore';

interface SetupScreenProps {
  onComplete: () => void;
}

const WHISPER_MODELS = [
  { value: 'tiny', label: 'Whisper Tiny', status: '~1GB RAM', description: 'Fastest, good for clear audio' },
  { value: 'base', label: 'Whisper Base', status: '~1.5GB RAM', description: 'Fast, slightly better accuracy' },
  { value: 'small', label: 'Whisper Small', status: '~2.5GB RAM', description: 'Balanced speed and accuracy' },
  { value: 'medium', label: 'Whisper Medium', status: '~6GB RAM', description: 'High accuracy, slower' },
  { value: 'large-v3', label: 'Whisper Large v3', status: '~12GB RAM', description: 'State-of-the-art accuracy' },
];

const LLM_MODELS = [
  { value: 'qwen3.5-2b', label: 'Qwen 3.5 2B', status: '~3GB RAM', description: 'Best for standard laptops' },
  { value: 'qwen3.5-4b', label: 'Qwen 3.5 4B', status: '~5GB RAM', description: 'Strong reasoning, requires good RAM' },
  { value: 'qwen3.5-9b', label: 'Qwen 3.5 9B', status: '~10GB RAM', description: 'Premium logic, for high-end machines' },
];

export function SetupScreen({ onComplete }: SetupScreenProps) {
  const [phase, setPhase] = useState<'config' | 'download'>('config');
  const [whisperModel, setWhisperModel] = useState('tiny');
  const [llmModel, setLlmModel] = useState('qwen3.5-2b');

  const [status, setStatus] = useState<string>('Initializing setup...');
  const [whisperProgress, setWhisperProgress] = useState<number>(0);
  const [llmProgress, setLlmProgress] = useState<number>(0);
  const [whisperDone, setWhisperDone] = useState(false);
  const [llmDone, setLlmDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startDownload = () => {
    setPhase('download');
    
    const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
      ? window.location.host 
      : '127.0.0.1:8000';

    const wsUrl = `ws://${host}/ws/setup?whisper_model=${whisperModel}&llm_model=${llmModel}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'progress') {
          setStatus(data.message);
          if (data.component === 'whisper') {
            setWhisperProgress(data.percent);
            if (data.percent === 100) setWhisperDone(true);
          } else if (data.component === 'llm') {
            setLlmProgress(data.percent);
            if (data.percent === 100) setLlmDone(true);
          }
        } else if (data.type === 'done') {
          setWhisperDone(true);
          setLlmDone(true);
          setWhisperProgress(100);
          setLlmProgress(100);
          
          useChatStore.getState().setSettings({
            model: whisperModel,
            chatModel: llmModel
          });
          
          setTimeout(() => {
            onComplete();
          }, 1500);
        } else if (data.type === 'error') {
          setError(data.message);
        }
      } catch (err) {
        console.error(err);
      }
    };

    ws.onerror = () => {
      setError('Failed to connect to setup server. Please restart the app.');
    };
  };

  return (
    <div className="fixed inset-0 z-50 bg-animated-gradient flex flex-col items-center justify-center p-6 text-[var(--foreground)]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-md w-full relative"
      >
        <div className="glass-panel-solid rounded-3xl p-8 flex flex-col items-center shadow-2xl w-full">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[var(--accent)]/20 rounded-full blur-3xl -z-10 animate-pulse pointer-events-none" />

          <div className="relative mb-6">
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center shadow-[0_0_40px_rgba(0,122,255,0.4)] relative z-10"
            >
              <Bot size={40} className="text-white drop-shadow-md" />
            </motion.div>
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full glass-panel bg-white/10 dark:bg-black/10 flex items-center justify-center shadow-lg z-20"
            >
              <Mic size={14} className="text-[var(--accent)]" />
            </motion.div>
          </div>
          
          <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2 tracking-tight text-center">First Time Setup</h1>
          <p className="text-[var(--foreground-secondary)] text-sm mb-6 text-center leading-relaxed">
            Configure your local AI models. They will be downloaded once and run 100% offline.
          </p>

          {error ? (
            <div className="w-full p-4 bg-[var(--error)]/10 text-[var(--error)] border border-[var(--error)]/20 rounded-xl text-sm mb-4 font-medium">
              {error}
            </div>
          ) : phase === 'config' ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full space-y-6"
            >
              <div className="space-y-3 relative z-[100]">
                <label className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                  <Mic size={16} className="text-[var(--accent)]" />
                  Transcription Engine
                </label>
                <CustomSelect
                  options={WHISPER_MODELS}
                  value={whisperModel}
                  onChange={setWhisperModel}
                />
              </div>

              <div className="space-y-3 relative z-[90]">
                <label className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                  <Bot size={16} className="text-[var(--accent)]" />
                  AI Assistant
                </label>
                <CustomSelect
                  options={LLM_MODELS}
                  value={llmModel}
                  onChange={setLlmModel}
                />
              </div>

              <button
                onClick={startDownload}
                className="w-full mt-6 py-3.5 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] text-white font-semibold shadow-lg shadow-[var(--accent)]/30 hover:shadow-[var(--accent)]/50 hover:scale-[1.02] active:scale-95 transition-all text-sm tracking-wide"
              >
                Start Setup & Download
              </button>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="w-full space-y-4"
            >
              <div className="glass-panel bg-black/5 dark:bg-white/5 p-4 rounded-2xl flex flex-col gap-3">
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-[var(--foreground)]">Transcription Engine</span>
                  <span className="text-[var(--accent)] font-mono">{whisperDone ? 'Complete' : `${whisperProgress}%`}</span>
                </div>
                <div className="h-2.5 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden shadow-inner">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-[var(--accent-hover)] to-[var(--accent)] rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${whisperProgress}%` }}
                    transition={{ ease: "linear", duration: 0.2 }}
                  />
                </div>
              </div>

              <div className="glass-panel bg-black/5 dark:bg-white/5 p-4 rounded-2xl flex flex-col gap-3">
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-[var(--foreground)]">AI Assistant</span>
                  <span className="text-[var(--accent)] font-mono">{llmDone ? 'Complete' : `${llmProgress}%`}</span>
                </div>
                <div className="h-2.5 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden shadow-inner">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-[var(--accent-hover)] to-[var(--accent)] rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${llmProgress}%` }}
                    transition={{ ease: "linear", duration: 0.2 }}
                  />
                </div>
              </div>

              <div className="pt-6 flex flex-col items-center justify-center gap-3">
                {whisperDone && llmDone ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 text-[var(--success)] font-semibold bg-[var(--success)]/10 px-4 py-2 rounded-full"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span>Setup complete! Starting app...</span>
                  </motion.div>
                ) : (
                  <div className="flex items-center gap-3 text-[var(--foreground-tertiary)] font-medium bg-black/5 dark:bg-white/5 px-4 py-2 rounded-full border border-[var(--glass-border)]">
                    <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
                    <span className="text-sm truncate max-w-[220px]">{status}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
