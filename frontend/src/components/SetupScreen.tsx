import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, Bot, Mic } from 'lucide-react';

interface SetupScreenProps {
  onComplete: () => void;
}

export function SetupScreen({ onComplete }: SetupScreenProps) {
  const [status, setStatus] = useState<string>('Initializing setup...');
  const [whisperProgress, setWhisperProgress] = useState<number>(0);
  const [llmProgress, setLlmProgress] = useState<number>(0);
  const [whisperDone, setWhisperDone] = useState(false);
  const [llmDone, setLlmDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
      ? window.location.host 
      : '127.0.0.1:8000';

    const wsUrl = `ws://${host}/ws/setup`;
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
          setTimeout(() => {
            onComplete();
          }, 1000);
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

    return () => {
      ws.close();
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-animated-gradient flex flex-col items-center justify-center p-6 text-[var(--foreground)]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-md w-full glass-panel-solid rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl relative overflow-hidden"
      >
        {/* Animated Glow behind the logo */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[var(--accent)]/20 rounded-full blur-3xl -z-10 animate-pulse" />

        <div className="relative mb-8">
          <motion.div 
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center shadow-[0_0_40px_rgba(0,122,255,0.4)] relative z-10"
          >
            <Bot size={48} className="text-white drop-shadow-md" />
          </motion.div>
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full glass-panel bg-white/10 dark:bg-black/10 flex items-center justify-center shadow-lg z-20"
          >
            <Mic size={18} className="text-[var(--accent)]" />
          </motion.div>
        </div>
        
        <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2 tracking-tight">First Time Setup</h1>
        <p className="text-[var(--foreground-secondary)] text-sm mb-8 px-4 leading-relaxed">
          Downloading default AI models for offline, privacy-first use. This only happens once.
        </p>

        {error ? (
          <div className="w-full p-4 bg-[var(--error)]/10 text-[var(--error)] border border-[var(--error)]/20 rounded-xl text-sm mb-4 font-medium">
            {error}
          </div>
        ) : (
          <div className="w-full space-y-4">
            {/* Whisper Progress */}
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

            {/* LLM Progress */}
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
          </div>
        )}
      </motion.div>
    </div>
  );
}
