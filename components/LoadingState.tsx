interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message }: LoadingStateProps) {
  return (
    <div className="rounded-xl bg-white p-8 text-center shadow-lg dark:bg-zinc-900">
      <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      <p className="text-zinc-600 dark:text-zinc-400">
        {message ?? 'Loading...'}
      </p>
    </div>
  );
}
