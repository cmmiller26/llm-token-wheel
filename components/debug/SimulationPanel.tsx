interface TokenCandidate {
  token: string;
  probability: number;
}

interface SimulationPanelProps {
  prompt: string;
  selectedTokens: string[];
  currentPosition: number;
  totalTokens: number;
  simulationComplete: boolean;
  currentToken: string;
  candidates: TokenCandidate[];
  loading: boolean;
  onExit: () => void;
  onAccept: () => void;
  onSelectAlternative: (token: string) => void;
  onRestart: () => void;
  formatToken: (token: string) => string;
}

export default function SimulationPanel({
  prompt,
  selectedTokens,
  currentPosition,
  totalTokens,
  simulationComplete,
  currentToken,
  candidates,
  loading,
  onExit,
  onAccept,
  onSelectAlternative,
  onRestart,
  formatToken,
}: SimulationPanelProps) {
  const builtText = prompt + selectedTokens.join('');

  return (
    <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-4 border-2 border-purple-300 dark:border-purple-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-purple-900 dark:text-purple-100">
          Wheel Simulation Mode
        </h3>
        <button
          onClick={onExit}
          className="text-xs px-2 py-1 bg-purple-200 dark:bg-purple-800 hover:bg-purple-300 dark:hover:bg-purple-700 rounded text-purple-700 dark:text-purple-300"
        >
          Exit Simulation
        </button>
      </div>

      {/* Current Built Text */}
      <div className="mb-4 p-3 bg-white dark:bg-zinc-900 rounded font-mono text-sm">
        <span className="text-zinc-500">{prompt}</span>
        <span className="text-purple-600 dark:text-purple-400 font-semibold">
          {selectedTokens.join('')}
        </span>
        {!simulationComplete && (
          <span className="animate-pulse text-purple-400">|</span>
        )}
      </div>

      {/* Progress */}
      <div className="mb-4 text-sm text-purple-700 dark:text-purple-300">
        Position: {currentPosition + 1} / {totalTokens}
        {simulationComplete && ' (Complete!)'}
      </div>

      {/* Simulation Complete State */}
      {simulationComplete ? (
        <div className="text-center py-4">
          <p className="text-purple-800 dark:text-purple-200 font-medium mb-2">
            Simulation Complete!
          </p>
          <p className="text-sm text-purple-600 dark:text-purple-400 mb-4">
            Final text: {builtText}
          </p>
          <button
            onClick={onRestart}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm"
          >
            Restart Simulation
          </button>
        </div>
      ) : (
        <>
          {/* Current Token Choice */}
          <div className="mb-2 text-sm text-purple-600 dark:text-purple-400">
            Original token:{' '}
            <span className="font-mono bg-green-100 dark:bg-green-900 px-1 rounded">
              {formatToken(currentToken)}
            </span>
          </div>

          {/* Token Candidates */}
          <div className="space-y-2 mb-4">
            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
              Click a token to select it (selecting a different token triggers
              regeneration):
            </p>
            {candidates.map((candidate, i) => {
              const isOriginal = candidate.token === currentToken;
              return (
                <button
                  key={i}
                  onClick={() => onSelectAlternative(candidate.token)}
                  disabled={loading}
                  className={`w-full flex items-center gap-2 p-2 rounded text-left transition-colors ${
                    isOriginal
                      ? 'bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800 border-2 border-green-400 dark:border-green-600'
                      : 'bg-white dark:bg-zinc-800 hover:bg-purple-100 dark:hover:bg-purple-900 border border-purple-200 dark:border-purple-700'
                  } ${
                    loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  <span
                    className={`font-mono text-sm ${
                      isOriginal
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {formatToken(candidate.token)}
                  </span>
                  <div className="flex-1 h-3 bg-zinc-200 dark:bg-zinc-700 rounded overflow-hidden">
                    <div
                      className={`h-full ${
                        isOriginal ? 'bg-green-500' : 'bg-purple-400'
                      }`}
                      style={{
                        width: `${Math.max(candidate.probability * 100, 1)}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 w-14 text-right">
                    {(candidate.probability * 100).toFixed(1)}%
                  </span>
                  {isOriginal && (
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                      (original)
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Accept Button */}
          <button
            onClick={onAccept}
            disabled={loading}
            className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 disabled:bg-zinc-400 disabled:cursor-not-allowed text-white font-medium rounded-lg text-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin">⟳</span>
                Regenerating...
              </>
            ) : (
              <>Accept &quot;{formatToken(currentToken)}&quot; & Next</>
            )}
          </button>
        </>
      )}
    </div>
  );
}
