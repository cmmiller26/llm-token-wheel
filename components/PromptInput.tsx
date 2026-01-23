import { QUICK_PROMPTS } from '@/lib/constants';

interface PromptInputProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  onStart: () => void;
  disabled?: boolean;
}

export default function PromptInput({
  prompt,
  onPromptChange,
  onStart,
  disabled,
}: PromptInputProps) {
  return (
    <div className="rounded-xl border border-zinc-100 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
      <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Start with a prompt
      </label>
      <textarea
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        className="h-24 w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        placeholder="Enter the beginning of a sentence..."
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">Try:</span>
        {QUICK_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => onPromptChange(p)}
            className="rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
          >
            {p}...
          </button>
        ))}
      </div>
      <button
        onClick={onStart}
        disabled={!prompt.trim() || disabled}
        className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:disabled:bg-zinc-700"
      >
        Start Generating
      </button>
    </div>
  );
}
