interface BuiltTextDisplayProps {
  prompt: string;
  selectedTokens: string[];
  ghostToken?: string;
  showCursor?: boolean;
}

export default function BuiltTextDisplay({
  prompt,
  selectedTokens,
  ghostToken,
  showCursor = true,
}: BuiltTextDisplayProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Generated Text
        </h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {selectedTokens.length} tokens selected
        </span>
      </div>
      <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg min-h-15">
        <span className="text-zinc-500 dark:text-zinc-400">{prompt}</span>
        <span className="text-zinc-900 dark:text-zinc-100 font-medium">
          {selectedTokens.join("")}
        </span>
        {ghostToken && (
          <span className="text-blue-500 dark:text-blue-400 font-medium animate-pulse">
            {ghostToken}
          </span>
        )}
        {showCursor && (
          <span className="inline-block w-0.5 h-5 bg-blue-500 ml-0.5 animate-pulse align-middle" />
        )}
      </div>
    </div>
  );
}
