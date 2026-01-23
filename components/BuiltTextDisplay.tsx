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
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-medium text-zinc-700 dark:text-zinc-300">
          Generated Text
        </h2>
        {(onUndo || onReset) && (
          <div className="flex gap-3">
            {showUndo && onUndo && (
              <button
                onClick={onUndo}
                className="py-1.5 px-3 text-sm bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 font-medium rounded-lg transition-colors"
              >
                Undo
              </button>
            )}
            {onReset && (
              <button
                onClick={onReset}
                className="py-1.5 px-3 text-sm bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
              >
                Start over
              </button>
            )}
          </div>
        )}
      </div>
      <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg min-h-15">
        <span className="text-zinc-500 dark:text-zinc-400">{prompt}</span>
        <span className="text-zinc-900 dark:text-zinc-100 font-medium">
          {selectedTokens.join('')}
        </span>
        {showCursor && (
          <span className="inline-block w-0.5 h-5 bg-blue-500 ml-0.5 animate-pulse align-middle" />
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
