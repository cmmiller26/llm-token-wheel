'use client';

import { useState, useCallback } from 'react';
import TokenWheel from '@/components/TokenWheel';
import { stitchToken } from '@/lib/utils';

interface GenerationData {
  tokens: string[];
  logprobsByPosition: Record<string, number>[];
}

type AppState =
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'spinning'; generation: GenerationData; position: number }
  | { type: 'ghost'; generation: GenerationData; position: number; ghostToken: string }
  | { type: 'complete' };

export default function Home() {
  // Core state
  const [prompt, setPrompt] = useState('The cat sat on the');
  const [builtText, setBuiltText] = useState('');
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  const [appState, setAppState] = useState<AppState>({ type: 'idle' });
  const [error, setError] = useState<string | null>(null);

  // Extract generation data and position from state
  const generation = appState.type === 'spinning' || appState.type === 'ghost'
    ? appState.generation
    : null;
  const currentPosition = appState.type === 'spinning' || appState.type === 'ghost'
    ? appState.position
    : 0;

  // Current token at position (what Gemini chose)
  const currentChosenToken = generation?.tokens[currentPosition] ?? '';
  const currentLogprobs = generation?.logprobsByPosition[currentPosition] ?? null;

  // Generate new tokens from the API
  const generate = useCallback(async (inputPrompt: string) => {
    setAppState({ type: 'loading' });
    setError(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: inputPrompt,
          maxTokens: 20,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.userMessage || data.error || 'Generation failed');
      }

      return {
        tokens: data.tokens,
        logprobsByPosition: data.logprobsByPosition,
      } as GenerationData;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setAppState({ type: 'idle' });
      return null;
    }
  }, []);

  // Start a new generation
  const handleStart = useCallback(async () => {
    if (!prompt.trim()) return;

    const gen = await generate(prompt);
    if (gen) {
      setBuiltText(prompt);
      setSelectedTokens([]);
      setAppState({ type: 'spinning', generation: gen, position: 0 });
    }
  }, [prompt, generate]);

  // Handle token selection from the wheel
  const handleTokenSelect = useCallback(async (token: string) => {
    if (appState.type !== 'spinning') return;

    const { generation: gen, position } = appState;
    const chosenToken = gen.tokens[position];

    if (token === chosenToken) {
      // Spin mode: Accept the AI's choice
      const newSelectedTokens = [...selectedTokens, token];
      const newBuiltText = stitchToken(builtText, token);

      setSelectedTokens(newSelectedTokens);
      setBuiltText(newBuiltText);

      // Check if we've reached the end
      if (position + 1 >= gen.tokens.length) {
        setAppState({ type: 'complete' });
      } else {
        setAppState({ type: 'spinning', generation: gen, position: position + 1 });
      }
    } else {
      // Manual selection: Show ghost mode
      setAppState({ type: 'ghost', generation: gen, position, ghostToken: token });
    }
  }, [appState, selectedTokens, builtText]);

  // Confirm ghost selection and regenerate
  const handleGhostConfirm = useCallback(async () => {
    if (appState.type !== 'ghost') return;

    const { ghostToken } = appState;
    const newSelectedTokens = [...selectedTokens, ghostToken];
    const newBuiltText = stitchToken(builtText, ghostToken);
    const newPrompt = newBuiltText;

    // Generate from the new context
    const gen = await generate(newPrompt);
    if (gen) {
      setSelectedTokens(newSelectedTokens);
      setBuiltText(newBuiltText);
      setAppState({ type: 'spinning', generation: gen, position: 0 });
    }
  }, [appState, selectedTokens, builtText, generate]);

  // Cancel ghost selection
  const handleGhostCancel = useCallback(() => {
    if (appState.type !== 'ghost') return;
    const { generation: gen, position } = appState;
    setAppState({ type: 'spinning', generation: gen, position });
  }, [appState]);

  // Reset to start over
  const handleReset = useCallback(() => {
    setBuiltText('');
    setSelectedTokens([]);
    setAppState({ type: 'idle' });
    setError(null);
  }, []);

  // Get the text to display (including ghost token if in ghost mode)
  const displayText = appState.type === 'ghost'
    ? stitchToken(builtText, appState.ghostToken)
    : builtText;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            Token Wheel
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Explore how AI generates text, one token at a time
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Input Section - Only show in idle state */}
        {appState.type === 'idle' && (
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-6 mb-6">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Start with a prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-24 px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Enter the beginning of a sentence..."
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Try:</span>
              {[
                'The cat sat on the',
                'Once upon a time',
                'In a world where',
                'She opened the door and',
              ].map((p) => (
                <button
                  key={p}
                  onClick={() => setPrompt(p)}
                  className="text-xs px-2 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-600 dark:text-zinc-400 transition-colors"
                >
                  {p}...
                </button>
              ))}
            </div>
            <button
              onClick={handleStart}
              disabled={!prompt.trim()}
              className="mt-4 w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              Start Generating
            </button>
          </div>
        )}

        {/* Loading State */}
        {appState.type === 'loading' && (
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-8 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-zinc-600 dark:text-zinc-400">Generating tokens...</p>
          </div>
        )}

        {/* Built Text Display */}
        {(appState.type === 'spinning' || appState.type === 'ghost' || appState.type === 'complete') && (
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Generated Text
              </h2>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {selectedTokens.length} tokens selected
              </span>
            </div>
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg min-h-[60px]">
              <span className="text-zinc-500 dark:text-zinc-400">{prompt}</span>
              <span className="text-zinc-900 dark:text-zinc-100 font-medium">
                {selectedTokens.join('')}
              </span>
              {appState.type === 'ghost' && (
                <span className="text-blue-500 dark:text-blue-400 font-medium animate-pulse">
                  {appState.ghostToken}
                </span>
              )}
              {appState.type !== 'complete' && (
                <span className="inline-block w-0.5 h-5 bg-blue-500 ml-0.5 animate-pulse align-middle" />
              )}
            </div>
          </div>
        )}

        {/* Ghost Mode Confirmation */}
        {appState.type === 'ghost' && (
          <div className="bg-amber-50 dark:bg-amber-950 border-2 border-amber-300 dark:border-amber-700 rounded-xl p-6 mb-6">
            <h3 className="font-medium text-amber-800 dark:text-amber-200 mb-2">
              Different Path Selected
            </h3>
            <p className="text-amber-700 dark:text-amber-300 text-sm mb-4">
              You selected <span className="font-mono font-bold">"{appState.ghostToken}"</span> instead of the AI's choice.
              This will regenerate the continuation from this point.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleGhostConfirm}
                className="flex-1 py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
              >
                Continue with this token
              </button>
              <button
                onClick={handleGhostCancel}
                className="py-2 px-4 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Token Wheel */}
        {appState.type === 'spinning' && currentLogprobs && (
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-6 mb-6">
            <div className="text-center mb-4">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Position {currentPosition + 1} of {generation?.tokens.length}
              </span>
            </div>
            <TokenWheel
              key={currentPosition}
              logprobs={currentLogprobs}
              chosenToken={currentChosenToken}
              onTokenSelect={handleTokenSelect}
            />
          </div>
        )}

        {/* Complete State */}
        {appState.type === 'complete' && (
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
            <div className="text-4xl mb-3">✓</div>
            <h3 className="font-medium text-green-800 dark:text-green-200 mb-2">
              Generation Complete!
            </h3>
            <p className="text-green-700 dark:text-green-300 text-sm mb-4">
              You've stepped through all {selectedTokens.length} tokens.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleReset}
                className="py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
              >
                Start Over
              </button>
              <button
                onClick={() => {
                  setPrompt(displayText);
                  handleReset();
                }}
                className="py-2 px-4 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg transition-colors"
              >
                Continue from here
              </button>
            </div>
          </div>
        )}

        {/* Controls */}
        {(appState.type === 'spinning' || appState.type === 'ghost') && (
          <div className="text-center">
            <button
              onClick={handleReset}
              className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 underline"
            >
              Start over with a new prompt
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
          <a href="/debug" className="hover:underline">
            Debug Page
          </a>
          {' · '}
          Powered by Gemini Flash
        </div>
      </div>
    </div>
  );
}
