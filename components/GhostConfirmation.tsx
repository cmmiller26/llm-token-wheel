interface GhostConfirmationProps {
  ghostToken: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function GhostConfirmation({
  ghostToken,
  onConfirm,
  onCancel,
}: GhostConfirmationProps) {
  return (
    <div className="bg-amber-50 dark:bg-amber-950 border-2 border-amber-300 dark:border-amber-700 rounded-xl p-6 mb-6">
      <h3 className="font-medium text-amber-800 dark:text-amber-200 mb-2">
        Different Path Selected
      </h3>
      <p className="text-amber-700 dark:text-amber-300 text-sm mb-4">
        You selected{" "}
        <span className="font-mono font-bold">&quot;{ghostToken}&quot;</span>{" "}
        instead of the AI&apos;s choice. This will regenerate the continuation
        from this point.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onConfirm}
          className="flex-1 py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
        >
          Continue with this token
        </button>
        <button
          onClick={onCancel}
          className="py-2 px-4 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
