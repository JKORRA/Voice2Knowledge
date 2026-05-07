import { useEffect } from 'react';
import { Check, FileAudio, CheckSquare, Square } from 'lucide-react';
import { useChatStore } from '../stores/chatStore';
import { cn } from '../lib/utils';

export function ContextSelector() {
  const { messages, selectedContextFiles, toggleContextFile, selectAllContextFiles, isGenerating, isTranscribing } = useChatStore();

  // Extract unique files from result messages
  const availableFiles = Array.from(new Set(
    messages
      .filter(m => m.type === 'result' && m.file)
      .map(m => m.file!)
  ));

  // Initialize selection when files are available but selection is empty
  useEffect(() => {
    if (availableFiles.length > 0 && selectedContextFiles.length === 0) {
      selectAllContextFiles(availableFiles);
    }
  }, [availableFiles.length, selectedContextFiles.length, selectAllContextFiles]);

  if (availableFiles.length === 0) {
    return null;
  }

  const getFilename = (filepath: string) => {
    return filepath.split(/[/\\]/).pop() || filepath;
  };

  const isAllSelected = selectedContextFiles.length === availableFiles.length;
  const isNoneSelected = selectedContextFiles.length === 0;

  const toggleAll = () => {
    if (isAllSelected) {
      selectAllContextFiles([]);
    } else {
      selectAllContextFiles(availableFiles);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto mb-3 bg-[var(--background-secondary)] rounded-xl border border-[var(--border)] overflow-hidden flex flex-col">
      <div className="px-4 py-2 border-b border-[var(--border)] flex justify-between items-center bg-[var(--card)]/50">
        <span className="text-xs font-medium text-[var(--foreground-secondary)] uppercase tracking-wider">
          Chat Context ({selectedContextFiles.length}/{availableFiles.length})
        </span>
        <button
          onClick={toggleAll}
          disabled={isGenerating || isTranscribing}
          className="text-xs flex items-center gap-1.5 text-[var(--foreground-secondary)] hover:text-[var(--accent)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAllSelected ? (
            <><CheckSquare size={14} /> Deselect All</>
          ) : (
            <><Square size={14} /> Select All</>
          )}
        </button>
      </div>
      <div className="flex flex-wrap gap-2 p-3 max-h-32 overflow-y-auto">
        {availableFiles.map(file => {
          const isSelected = selectedContextFiles.includes(file);
          return (
            <button
              key={file}
              onClick={() => toggleContextFile(file)}
              disabled={isGenerating || isTranscribing}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all duration-200",
                isSelected 
                  ? "bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)]"
                  : "bg-[var(--card)] border-[var(--border)] text-[var(--foreground-tertiary)] hover:border-[var(--foreground-secondary)] hover:text-[var(--foreground-secondary)]",
                (isGenerating || isTranscribing) && "opacity-50 cursor-not-allowed"
              )}
              title={file}
            >
              <FileAudio size={14} />
              <span className="max-w-[150px] truncate">{getFilename(file)}</span>
              {isSelected && <Check size={14} className="shrink-0" />}
            </button>
          );
        })}
      </div>
      {isNoneSelected && (
        <div className="px-4 py-2 bg-[var(--error)]/10 text-[var(--error)] text-xs text-center border-t border-[var(--error)]/20">
          Please select at least one file to use as context for your questions.
        </div>
      )}
    </div>
  );
}
