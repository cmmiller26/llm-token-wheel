interface CompletionBannerProps {
  tokenCount: number;
  onReset: () => void;
  onContinue: () => void;
}

export default function CompletionBanner({
  tokenCount,
  onReset,
  onContinue,
}: CompletionBannerProps) {
  return (
    <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
      <div className="text-4xl mb-3">✓</div>
      <h3 className="font-medium text-green-800 dark:text-green-200 mb-2">
        Generation Complete!
      </h3>
      <p className="text-green-700 dark:text-green-300 text-sm mb-4">
        You&apos;ve stepped through all {tokenCount} tokens.
      </p>
      <div className="flex gap-3 justify-center">
        <button
          onClick={onReset}
          className="py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
        >
          Start Over
        </button>
        <button
          onClick={onContinue}
          className="py-2 px-4 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg transition-colors"
        >
          Continue from here
        </button>
      </div>
    </div>
  );
}
