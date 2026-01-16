interface GenerationResponse {
  success: boolean;
  generatedText: string;
  tokens: string[];
  logprobsByPosition: Record<string, number>[];
}

interface HistoryItem {
  prompt: string;
  response: GenerationResponse;
  timestamp: Date;
  responseTime: number;
}

interface ApiHistoryProps {
  history: HistoryItem[];
  onSelectItem: (item: HistoryItem) => void;
}

export default function ApiHistory({ history, onSelectItem }: ApiHistoryProps) {
  if (history.length === 0) return null;

  return (
    <div className="mt-8 bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
      <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-4">
        Recent Tests
      </h3>
      <div className="space-y-2">
        {history.map((item, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-2 bg-zinc-50 dark:bg-zinc-800 rounded text-sm cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700"
            onClick={() => onSelectItem(item)}
          >
            <div className="flex-1 truncate">
              <span className="text-zinc-500 dark:text-zinc-400">
                {item.prompt}
              </span>
              <span className="text-green-600 dark:text-green-400">
                {item.response.generatedText.slice(0, 30)}...
              </span>
            </div>
            <div className="text-xs text-zinc-400 dark:text-zinc-500 ml-2">
              {item.responseTime}ms
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
