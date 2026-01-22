interface PromptInputProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  onStart: () => void;
  disabled?: boolean;
}

const QUICK_PROMPTS = [
  'The cat sat on the',
  'Once upon a time',
  'In a world where',
  'She opened the door and',
];

export default function PromptInput({
  prompt,
  onPromptChange,
  onStart,
  disabled,
}: PromptInputProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-6 mb-6">
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
        Start with a prompt
      </label>
      <textarea
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        className="w-full h-24 px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        placeholder="Enter the beginning of a sentence..."
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">Try:</span>
        {QUICK_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => onPromptChange(p)}
            className="text-xs px-2 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-600 dark:text-zinc-400 transition-colors"
          >
            {p}...
          </button>
        ))}
      </div>
      <button
        onClick={onStart}
        disabled={!prompt.trim() || disabled}
        className="mt-4 w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
      >
        Start Generating
      </button>
    </div>
  );
}
