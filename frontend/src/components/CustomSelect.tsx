import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface Option {
  value: string;
  label: string;
  description?: string;
  status?: string;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function CustomSelect({ options, value, onChange, disabled }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <div className={cn("relative w-full transition-all", isOpen ? "z-50" : "z-10")} ref={containerRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-full p-3 rounded-lg border border-[var(--glass-border)] bg-black/5 dark:bg-white/5 text-[var(--foreground)] text-sm backdrop-blur-sm flex items-center justify-between transition-all duration-200 text-left",
          isOpen ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/20" : "hover:border-[var(--glass-border-focus)]",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <div className="flex flex-col items-start truncate overflow-hidden">
          <span className="font-medium truncate">{selectedOption.label} {selectedOption.status ? `(${selectedOption.status})` : ''}</span>
          {selectedOption.description && (
            <span className="text-xs text-[var(--foreground-tertiary)] truncate w-full text-left">{selectedOption.description}</span>
          )}
        </div>
        <ChevronDown size={16} className={cn("text-[var(--foreground-secondary)] shrink-0 transition-transform duration-200 ml-2", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-2 rounded-xl glass-panel-solid border border-[var(--glass-border)] shadow-xl overflow-hidden"
          >
            <div className="max-h-60 overflow-y-auto py-1">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-[var(--accent)]/10 transition-colors",
                    value === opt.value ? "bg-[var(--accent)]/5" : ""
                  )}
                >
                  <div className="mt-0.5 shrink-0 w-4">
                    {value === opt.value && <Check size={16} className="text-[var(--accent)]" />}
                  </div>
                  <div className="flex flex-col flex-1 overflow-hidden">
                    <span className={cn(
                      "text-sm font-medium truncate",
                      value === opt.value ? "text-[var(--accent)]" : "text-[var(--foreground)]"
                    )}>
                      {opt.label} {opt.status ? `(${opt.status})` : ''}
                    </span>
                    {opt.description && (
                      <span className="text-xs text-[var(--foreground-secondary)] truncate">
                        {opt.description}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
