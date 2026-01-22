interface TokenCandidate {
  token: string;
  probability: number;
}

interface TokenVisualizationProps {
  tokens: string[];
  logprobsByPosition: Record<string, number>[];
  formatToken: (token: string) => string;
  onCopyTokens: () => void;
  onCopyLogprobs: () => void;
}

export default function TokenVisualization({
  tokens,
  logprobsByPosition,
  formatToken,
  onCopyTokens,
  onCopyLogprobs,
}: TokenVisualizationProps) {
  function getTokenCandidates(position: number): TokenCandidate[] {
    if (!logprobsByPosition[position]) return [];

    return Object.entries(logprobsByPosition[position])
      .map(([token, probability]) => ({ token, probability }))
      .sort((a, b) => b.probability - a.probability);
  }

  return (
    <>
      {/* Token Array */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
            Tokens Array ({tokens.length} tokens)
          </h3>
          <button
            onClick={onCopyTokens}
            className="text-xs px-2 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-600 dark:text-zinc-400"
          >
            Copy JSON
          </button>
        </div>
        <div className="flex flex-wrap gap-1">
          {tokens.map((token, i) => (
            <span
              key={i}
              className="inline-flex items-center px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded font-mono text-sm"
              title={`Raw: "${token}"`}
            >
              <span className="text-blue-400 dark:text-blue-500 mr-1 text-xs">
                {i}
              </span>
              {formatToken(token)}
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Legend: · = space, ↵ = newline, → = tab
        </p>
      </div>

      {/* Token Probabilities */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
            Token Probabilities by Position
          </h3>
          <button
            onClick={onCopyLogprobs}
            className="text-xs px-2 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-600 dark:text-zinc-400"
          >
            Copy Logprobs JSON
          </button>
        </div>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {tokens.map((chosenToken, position) => {
            const candidates = getTokenCandidates(position);
            return (
              <div
                key={position}
                className="border-b border-zinc-100 dark:border-zinc-800 pb-4 last:border-0"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 w-16">
                    Pos {position}
                  </span>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">
                    Chosen:
                  </span>
                  <span className="font-mono text-sm bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-0.5 rounded">
                    {formatToken(chosenToken)}
                  </span>
                </div>

                <div className="space-y-1">
                  {candidates.map((candidate, i) => {
                    const isChosen = candidate.token === chosenToken;
                    const barWidth = Math.max(candidate.probability * 100, 1);
                    return (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span
                          className={`font-mono w-24 truncate ${isChosen ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-zinc-600 dark:text-zinc-400'}`}
                          title={`Raw: "${candidate.token}"`}
                        >
                          {formatToken(candidate.token)}
                        </span>
                        <div className="flex-1 h-4 bg-zinc-100 dark:bg-zinc-800 rounded overflow-hidden">
                          <div
                            className={`h-full ${isChosen ? 'bg-green-500' : 'bg-blue-400'}`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <span className="w-16 text-right text-zinc-500 dark:text-zinc-400">
                          {(candidate.probability * 100).toFixed(1)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
