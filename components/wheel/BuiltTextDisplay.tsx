interface BuiltTextDisplayProps {
  prompt: string;
  selectedTokens: string[];
  showCursor?: boolean;
  showUndo?: boolean;
  onUndo?: () => void;
  onReset?: () => void;
}

export default function BuiltTextDisplay({
  prompt,
  selectedTokens,
  showCursor = true,
  showUndo = false,
  onUndo,
  onReset,
}: BuiltTextDisplayProps) {
  return (
    <div className="rounded-xl border border-zinc-100 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-medium text-zinc-700 dark:text-zinc-300">
          Generated Text
        </h2>
        {(onUndo || onReset) && (
          <div className="flex gap-3">
            {showUndo && onUndo && (
              <button
                onClick={onUndo}
                className="rounded-lg bg-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
              >
                Undo
              </button>
            )}
            {onReset && (
              <button
                onClick={onReset}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                Start over
              </button>
            )}
          </div>
        )}
      </div>
      <div className="min-h-15 rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800">
        <span className="text-zinc-500 dark:text-zinc-400">{prompt}</span>
        <span className="font-medium text-zinc-900 dark:text-zinc-100">
          {selectedTokens.join('')}
        </span>
        {showCursor && (
          <span className="ml-0.5 inline-block h-5 w-0.5 animate-pulse bg-blue-500 align-middle" />
        )}
      </div>
      <div className="text-right">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {selectedTokens.length} tokens selected
        </span>
      </div>
    </div>
  );
}
