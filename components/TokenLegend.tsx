'use client';

import { formatTokenForDisplay, WedgeData } from '@/lib/utils';
import { WEDGE_COLORS } from '@/lib/constants';

interface TokenLegendProps {
  wedges: WedgeData[];
  selectedToken: string | null;
  onTokenClick: (token: string) => void;
  disabled: boolean;
}

export default function TokenLegend({
  wedges,
  selectedToken,
  onTokenClick,
  disabled,
}: TokenLegendProps) {
  return (
    <div className="w-full rounded-xl border border-zinc-100 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="mb-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">
        Token Probabilities
      </h3>
      {/* Token buttons */}
      <div className="flex flex-col gap-2">
        {wedges.slice(0, 8).map((wedge, index) => (
          <button
            key={wedge.token}
            onClick={() => onTokenClick(wedge.token)}
            disabled={disabled}
            className={`flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-1.5 text-sm transition-all duration-200 dark:bg-zinc-800 ${
              selectedToken === wedge.token
                ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-white dark:ring-offset-zinc-900'
                : ''
            } ${
              disabled
                ? 'cursor-not-allowed opacity-50'
                : 'cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700'
            } `}
          >
            <span
              className="h-4 w-4 shrink-0 rounded"
              style={{
                backgroundColor: WEDGE_COLORS[index % WEDGE_COLORS.length],
              }}
            />
            <span className="max-w-24 truncate font-mono text-zinc-700 dark:text-zinc-300">
              {formatTokenForDisplay(wedge.token)}
            </span>
            <span className="ml-auto text-zinc-400 dark:text-zinc-500">
              {(wedge.probability * 100).toFixed(1)}%
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
