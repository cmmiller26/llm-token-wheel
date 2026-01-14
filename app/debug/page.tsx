'use client';

import { useState } from 'react';

interface TokenCandidate {
  token: string;
  probability: number;
}

interface GenerationResponse {
  success: boolean;
  generatedText: string;
  tokens: string[];
  logprobsByPosition: Record<string, number>[];
}

interface ErrorResponse {
  error: string;
  reason?: string;
  userMessage?: string;
  details?: string;
}

const DEFAULT_SYSTEM_INSTRUCTION = `You are a text continuation assistant. The user will provide incomplete text, and you must continue it naturally.

CRITICAL: Your output is concatenated directly to the user's input with no separator. If the user's text ends with a complete word (like "the" or "a"), your first token MUST start with a space. Only omit the leading space if the user's text ends with a space or mid-word.

Rules:
1. Write 1-2 complete sentences to finish the thought naturally.
2. Do NOT repeat the ending of the user's input at the start of your response.
3. Do NOT use markdown formatting, bullet points, or special characters.
4. Write in a natural, flowing style that matches the tone of the input.`;

const TEST_PROMPTS = [
  "The cat sat on the",
  "Once upon a time, there was a",
  "The quick brown fox",
  "In a galaxy far, far",
  "She opened the door and saw",
];

export default function DebugPage() {
  // Form state
  const [prompt, setPrompt] = useState('The cat sat on the');
  const [systemInstruction, setSystemInstruction] = useState('');
  const [maxTokens, setMaxTokens] = useState(50);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [temperature, setTemperature] = useState(0.9);
  const [topP, setTopP] = useState(0.95);
  const [topK, setTopK] = useState(40);
  const [numLogprobs, setNumLogprobs] = useState(8);

  // Response state
  const [response, setResponse] = useState<GenerationResponse | null>(null);
  const [error, setError] = useState<ErrorResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [responseTime, setResponseTime] = useState<number | null>(null);

  // Simulation state
  const [simulationMode, setSimulationMode] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  const [simulationComplete, setSimulationComplete] = useState(false);

  // History state
  const [history, setHistory] = useState<Array<{
    prompt: string;
    response: GenerationResponse;
    timestamp: Date;
    responseTime: number;
  }>>([]);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    const startTime = Date.now();

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          systemInstruction: systemInstruction || undefined,
          maxTokens,
          temperature,
          topP,
          topK,
          numLogprobs,
        }),
      });

      const data = await res.json();
      const elapsed = Date.now() - startTime;
      setResponseTime(elapsed);

      if (!res.ok) {
        setError(data as ErrorResponse);
        setResponse(null);
      } else {
        setResponse(data as GenerationResponse);
        setHistory(prev => [{
          prompt,
          response: data,
          timestamp: new Date(),
          responseTime: elapsed,
        }, ...prev].slice(0, 10)); // Keep last 10
      }
    } catch (err) {
      setError({
        error: 'Network error',
        details: err instanceof Error ? err.message : 'Unknown error',
      });
      setResponse(null);
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  // Simulation functions
  function startSimulation() {
    if (!response) return;
    setSimulationMode(true);
    setCurrentPosition(0);
    setSelectedTokens([]);
    setSimulationComplete(false);
  }

  function exitSimulation() {
    setSimulationMode(false);
    setCurrentPosition(0);
    setSelectedTokens([]);
    setSimulationComplete(false);
  }

  function acceptCurrentToken() {
    if (!response) return;
    const currentToken = response.tokens[currentPosition];
    const newSelectedTokens = [...selectedTokens, currentToken];
    setSelectedTokens(newSelectedTokens);

    if (currentPosition + 1 >= response.tokens.length) {
      setSimulationComplete(true);
    } else {
      setCurrentPosition(currentPosition + 1);
    }
  }

  async function selectAlternativeToken(token: string) {
    if (!response) return;

    // Add selected token to our list
    const newSelectedTokens = [...selectedTokens, token];

    // Check if this is the same as the original token (no regen needed)
    if (token === response.tokens[currentPosition]) {
      acceptCurrentToken();
      return;
    }

    // Need to regenerate from this point!
    // Build the new prompt: original prompt + all selected tokens so far (including this one)
    const newPrompt = prompt + newSelectedTokens.join('');

    setLoading(true);
    setError(null);
    const startTime = Date.now();

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: newPrompt,
          systemInstruction: systemInstruction || undefined,
          maxTokens,
          temperature,
          topP,
          topK,
          numLogprobs,
        }),
      });

      const data = await res.json();
      const elapsed = Date.now() - startTime;
      setResponseTime(elapsed);

      if (!res.ok) {
        setError(data as ErrorResponse);
      } else {
        // Update response with new generation
        const newResponse = data as GenerationResponse;
        // Prepend our selected tokens to the new response
        setResponse({
          ...newResponse,
          tokens: [...newSelectedTokens, ...newResponse.tokens],
          generatedText: newSelectedTokens.join('') + newResponse.generatedText,
          logprobsByPosition: [
            // Keep the logprobs we already had for selected positions
            ...response.logprobsByPosition.slice(0, newSelectedTokens.length),
            // Add the new logprobs
            ...newResponse.logprobsByPosition,
          ],
        });
        setSelectedTokens(newSelectedTokens);
        setCurrentPosition(newSelectedTokens.length);
      }
    } catch (err) {
      setError({
        error: 'Network error during regeneration',
        details: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  }

  function getBuiltText(): string {
    return prompt + selectedTokens.join('');
  }

  function getCurrentCandidates(): TokenCandidate[] {
    if (!response?.logprobsByPosition[currentPosition]) return [];

    return Object.entries(response.logprobsByPosition[currentPosition])
      .map(([token, probability]) => ({ token, probability }))
      .sort((a, b) => b.probability - a.probability);
  }

  function formatToken(token: string): string {
    // Show special characters visually
    return token
      .replace(/\n/g, '↵')
      .replace(/\t/g, '→')
      .replace(/ /g, '·');
  }

  function getTokenCandidates(position: number): TokenCandidate[] {
    if (!response?.logprobsByPosition[position]) return [];

    return Object.entries(response.logprobsByPosition[position])
      .map(([token, probability]) => ({ token, probability }))
      .sort((a, b) => b.probability - a.probability);
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            API Debug Page
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Test Gemini API integration, verify token structure, and inspect logprobs.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Input Form */}
          <div className="space-y-6">
            {/* Prompt Input */}
            <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full h-24 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md font-mono text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your prompt..."
              />

              {/* Quick Test Prompts */}
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Quick prompts:</span>
                {TEST_PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(p)}
                    className="text-xs px-2 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-700 dark:text-zinc-300 transition-colors"
                  >
                    {p.slice(0, 20)}...
                  </button>
                ))}
              </div>
            </div>

            {/* System Instruction */}
            <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                System Instruction (optional)
              </label>
              <textarea
                value={systemInstruction}
                onChange={(e) => setSystemInstruction(e.target.value)}
                className="w-full h-20 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md font-mono text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={DEFAULT_SYSTEM_INSTRUCTION}
              />
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Leave empty to use default. Current default shown as placeholder.
              </p>
            </div>

            {/* Basic Controls */}
            <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Max Tokens: {maxTokens}
                </label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(Number(e.target.value))}
                  className="w-48 accent-blue-500"
                />
              </div>

              {/* Advanced Settings Toggle */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                {showAdvanced ? '▼ Hide' : '▶ Show'} Advanced Settings
              </button>

              {showAdvanced && (
                <div className="mt-4 space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-zinc-600 dark:text-zinc-400">
                      Temperature: {temperature.toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.05"
                      value={temperature}
                      onChange={(e) => setTemperature(Number(e.target.value))}
                      className="w-36 accent-blue-500"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-zinc-600 dark:text-zinc-400">
                      Top P: {topP.toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={topP}
                      onChange={(e) => setTopP(Number(e.target.value))}
                      className="w-36 accent-blue-500"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-zinc-600 dark:text-zinc-400">
                      Top K: {topK}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={topK}
                      onChange={(e) => setTopK(Number(e.target.value))}
                      className="w-36 accent-blue-500"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-zinc-600 dark:text-zinc-400">
                      Logprobs per position: {numLogprobs}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={numLogprobs}
                      onChange={(e) => setNumLogprobs(Number(e.target.value))}
                      className="w-36 accent-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⟳</span>
                  Generating...
                </>
              ) : (
                'Generate'
              )}
            </button>

            {/* Response Time */}
            {responseTime !== null && (
              <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
                Response time: {responseTime}ms
              </p>
            )}
          </div>

          {/* Right Column: Response Display */}
          <div className="space-y-6">
            {/* Error Display */}
            {error && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <h3 className="font-medium text-red-800 dark:text-red-200 mb-2">Error</h3>
                <p className="text-red-700 dark:text-red-300 text-sm">{error.error}</p>
                {error.reason && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1">Reason: {error.reason}</p>
                )}
                {error.userMessage && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error.userMessage}</p>
                )}
                {error.details && (
                  <p className="text-red-500 dark:text-red-500 text-xs mt-2 font-mono">{error.details}</p>
                )}
              </div>
            )}

            {/* Generated Text */}
            {response && (
              <>
                <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Generated Text</h3>
                    <div className="flex gap-2">
                      {!simulationMode && (
                        <button
                          onClick={startSimulation}
                          className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900 hover:bg-purple-200 dark:hover:bg-purple-800 rounded text-purple-700 dark:text-purple-300 font-medium"
                        >
                          Start Simulation
                        </button>
                      )}
                      <button
                        onClick={() => copyToClipboard(response.generatedText)}
                        className="text-xs px-2 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-600 dark:text-zinc-400"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded font-mono text-sm">
                    <span className="text-zinc-500">{prompt}</span>
                    <span className="text-green-600 dark:text-green-400 font-semibold">{response.generatedText}</span>
                  </div>
                </div>

                {/* Simulation Mode Panel */}
                {simulationMode && (
                  <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-4 border-2 border-purple-300 dark:border-purple-700">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium text-purple-900 dark:text-purple-100">
                        Wheel Simulation Mode
                      </h3>
                      <button
                        onClick={exitSimulation}
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
                      Position: {currentPosition + 1} / {response.tokens.length}
                      {simulationComplete && ' (Complete!)'}
                    </div>

                    {/* Simulation Complete State */}
                    {simulationComplete ? (
                      <div className="text-center py-4">
                        <p className="text-purple-800 dark:text-purple-200 font-medium mb-2">
                          Simulation Complete!
                        </p>
                        <p className="text-sm text-purple-600 dark:text-purple-400 mb-4">
                          Final text: {getBuiltText()}
                        </p>
                        <button
                          onClick={startSimulation}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm"
                        >
                          Restart Simulation
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Current Token Choice */}
                        <div className="mb-2 text-sm text-purple-600 dark:text-purple-400">
                          Original token: <span className="font-mono bg-green-100 dark:bg-green-900 px-1 rounded">{formatToken(response.tokens[currentPosition])}</span>
                        </div>

                        {/* Token Candidates */}
                        <div className="space-y-2 mb-4">
                          <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                            Click a token to select it (selecting a different token triggers regeneration):
                          </p>
                          {getCurrentCandidates().map((candidate, i) => {
                            const isOriginal = candidate.token === response.tokens[currentPosition];
                            return (
                              <button
                                key={i}
                                onClick={() => selectAlternativeToken(candidate.token)}
                                disabled={loading}
                                className={`w-full flex items-center gap-2 p-2 rounded text-left transition-colors ${
                                  isOriginal
                                    ? 'bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800 border-2 border-green-400 dark:border-green-600'
                                    : 'bg-white dark:bg-zinc-800 hover:bg-purple-100 dark:hover:bg-purple-900 border border-purple-200 dark:border-purple-700'
                                } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                              >
                                <span className={`font-mono text-sm ${isOriginal ? 'text-green-700 dark:text-green-300' : 'text-zinc-700 dark:text-zinc-300'}`}>
                                  {formatToken(candidate.token)}
                                </span>
                                <div className="flex-1 h-3 bg-zinc-200 dark:bg-zinc-700 rounded overflow-hidden">
                                  <div
                                    className={`h-full ${isOriginal ? 'bg-green-500' : 'bg-purple-400'}`}
                                    style={{ width: `${Math.max(candidate.probability * 100, 1)}%` }}
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
                          onClick={acceptCurrentToken}
                          disabled={loading}
                          className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 disabled:bg-zinc-400 disabled:cursor-not-allowed text-white font-medium rounded-lg text-sm flex items-center justify-center gap-2"
                        >
                          {loading ? (
                            <>
                              <span className="animate-spin">⟳</span>
                              Regenerating...
                            </>
                          ) : (
                            <>Accept "{formatToken(response.tokens[currentPosition])}" & Next</>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Token Array */}
                <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                      Tokens Array ({response.tokens.length} tokens)
                    </h3>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(response.tokens, null, 2))}
                      className="text-xs px-2 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-600 dark:text-zinc-400"
                    >
                      Copy JSON
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {response.tokens.map((token, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded font-mono text-sm"
                        title={`Raw: "${token}"`}
                      >
                        <span className="text-blue-400 dark:text-blue-500 mr-1 text-xs">{i}</span>
                        {formatToken(token)}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    Legend: · = space, ↵ = newline, → = tab
                  </p>
                </div>

                {/* Token Visualization */}
                <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Token Probabilities by Position</h3>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(response.logprobsByPosition, null, 2))}
                      className="text-xs px-2 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-600 dark:text-zinc-400"
                    >
                      Copy Logprobs JSON
                    </button>
                  </div>

                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {response.tokens.map((chosenToken, position) => {
                      const candidates = getTokenCandidates(position);
                      return (
                        <div key={position} className="border-b border-zinc-100 dark:border-zinc-800 pb-4 last:border-0">
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

                {/* Raw JSON */}
                <details className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <summary className="p-4 cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                    View Raw Response JSON
                  </summary>
                  <div className="p-4 pt-0">
                    <pre className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded font-mono text-xs overflow-x-auto text-zinc-800 dark:text-zinc-200">
                      {JSON.stringify(response, null, 2)}
                    </pre>
                  </div>
                </details>
              </>
            )}

            {/* Empty State */}
            {!response && !error && !loading && (
              <div className="bg-white dark:bg-zinc-900 rounded-lg p-8 border border-zinc-200 dark:border-zinc-800 text-center">
                <p className="text-zinc-500 dark:text-zinc-400">
                  Enter a prompt and click Generate to test the API.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* History Section */}
        {history.length > 0 && (
          <div className="mt-8 bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
            <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-4">Recent Tests</h3>
            <div className="space-y-2">
              {history.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 bg-zinc-50 dark:bg-zinc-800 rounded text-sm cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700"
                  onClick={() => {
                    setPrompt(item.prompt);
                    setResponse(item.response);
                    setResponseTime(item.responseTime);
                  }}
                >
                  <div className="flex-1 truncate">
                    <span className="text-zinc-500 dark:text-zinc-400">{item.prompt}</span>
                    <span className="text-green-600 dark:text-green-400">{item.response.generatedText.slice(0, 30)}...</span>
                  </div>
                  <div className="text-xs text-zinc-400 dark:text-zinc-500 ml-2">
                    {item.responseTime}ms
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Testing Guide */}
        <div className="mt-8 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <h3 className="font-medium text-amber-800 dark:text-amber-200 mb-2">Testing Guide</h3>
          <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
            <li><strong>Token Spacing:</strong> Check if tokens include leading spaces (shown as ·). First continuation token behavior may vary.</li>
            <li><strong>System Instructions:</strong> Override the system instruction to test different continuation behaviors.</li>
            <li><strong>Spin Mode Validation:</strong> The tokens array + logprobsByPosition support stepping through without re-generation.</li>
            <li><strong>Manual Selection:</strong> When user picks a different token than chosen, only then do we need to regenerate.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
