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
    <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center dark:border-green-800 dark:bg-green-950">
      <div className="mb-3 text-4xl">✓</div>
      <h3 className="mb-2 font-medium text-green-800 dark:text-green-200">
        Generation Complete!
      </h3>
      <p className="mb-4 text-sm text-green-700 dark:text-green-300">
        You&apos;ve stepped through all {tokenCount} tokens.
      </p>
      <div className="flex justify-center gap-3">
        <button
          onClick={onReset}
          className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-700"
        >
          Start Over
        </button>
        <button
          onClick={onContinue}
          className="rounded-lg bg-zinc-200 px-4 py-2 font-medium text-zinc-700 transition-colors hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
        >
          Continue from here
        </button>
      </div>
    </div>
  );
}
