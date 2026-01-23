'use client';

import { formatTokenForDisplay } from '@/lib/utils';
import { WEDGE_COLORS } from '@/lib/constants';

interface WedgeData {
  token: string;
  probability: number;
}

interface TokenLegendProps {
  wedges: WedgeData[];
  chosenToken: string;
  selectedToken: string | null;
  onTokenClick: (token: string) => void;
  disabled: boolean;
}

export default function TokenLegend({
  wedges,
  chosenToken,
  selectedToken,
  onTokenClick,
  disabled,
}: TokenLegendProps) {
  return (
    <div className="w-full max-w-md lg:max-w-none lg:w-auto">
      {/* Token buttons */}
      <div className="flex flex-wrap gap-1 justify-center lg:flex-col lg:gap-1.5">
        {wedges.slice(0, 8).map((wedge, index) => {
          const isChosen = wedge.token === chosenToken;
          return (
            <button
              key={wedge.token}
              onClick={() => onTokenClick(wedge.token)}
              disabled={disabled}
              className={`
                flex items-center gap-1 px-2 py-1 rounded text-xs
                transition-all duration-200
                ${
                  isChosen
                    ? 'ring-2 ring-amber-400 ring-offset-1 bg-amber-50 dark:bg-amber-950'
                    : ''
                }
                ${
                  selectedToken === wedge.token
                    ? 'ring-2 ring-blue-500 ring-offset-1'
                    : ''
                }
                ${
                  disabled
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer'
                }
              `}
            >
              <span
                className="w-3 h-3 rounded-sm shrink-0"
                style={{
                  backgroundColor: WEDGE_COLORS[index % WEDGE_COLORS.length],
                }}
              />
              <span className="font-mono text-zinc-700 dark:text-zinc-300 truncate max-w-20">
                {formatTokenForDisplay(wedge.token)}
              </span>
              <span className="text-zinc-400 dark:text-zinc-500">
                {(wedge.probability * 100).toFixed(0)}%
              </span>
              {isChosen && (
                <span className="text-amber-500 text-[10px]">AI</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
