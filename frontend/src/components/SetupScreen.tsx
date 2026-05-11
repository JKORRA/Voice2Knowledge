import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Sparkles, CheckCircle } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 bg-[var(--background)] flex flex-col items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-xl p-8 flex flex-col items-center text-center"
      >
        <div className="w-16 h-16 bg-[var(--accent)]/10 rounded-2xl flex items-center justify-center mb-6">
          <Sparkles className="text-[var(--accent)] w-8 h-8" />
        </div>
        
        <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">First Time Setup</h1>
        <p className="text-[var(--foreground-secondary)] mb-8">
          Downloading default AI models for offline use. This only happens once.
        </p>

        {error ? (
          <div className="w-full p-4 bg-[var(--error)]/10 text-[var(--error)] rounded-xl text-sm mb-4">
            {error}
          </div>
        ) : (
          <div className="w-full space-y-6">
            {/* Whisper Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-[var(--foreground)]">Transcription Engine</span>
                <span className="text-[var(--accent)]">{whisperDone ? 'Complete' : `${whisperProgress}%`}</span>
              </div>
              <div className="h-2 w-full bg-[var(--background-secondary)] rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-[var(--accent)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${whisperProgress}%` }}
                  transition={{ ease: "linear", duration: 0.2 }}
                />
              </div>
            </div>

            {/* LLM Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-[var(--foreground)]">AI Assistant</span>
                <span className="text-[var(--accent)]">{llmDone ? 'Complete' : `${llmProgress}%`}</span>
              </div>
              <div className="h-2 w-full bg-[var(--background-secondary)] rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-[var(--accent)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${llmProgress}%` }}
                  transition={{ ease: "linear", duration: 0.2 }}
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-center gap-3 text-[var(--foreground-tertiary)] text-sm">
              {whisperDone && llmDone ? (
                <>
                  <CheckCircle className="w-4 h-4 text-[var(--success)]" />
                  <span>Setup complete! Starting app...</span>
                </>
              ) : (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="truncate max-w-[250px]">{status}</span>
                </>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
