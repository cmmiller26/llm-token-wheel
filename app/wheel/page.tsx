'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TokenWheel from '@/components/TokenWheel';
import BuiltTextDisplay from '@/components/BuiltTextDisplay';
import CompletionBanner from '@/components/CompletionBanner';
import Header from '@/components/Header';
import { stitchToken, stitchTokens } from '@/lib/utils';
import {
  DEFAULT_TEMPERATURE,
  DEFAULT_SYSTEM_INSTRUCTION,
  STORAGE_KEYS,
} from '@/lib/constants';

interface GenerationData {
  id: number;
  tokens: string[];
  logprobsByPosition: Record<string, number>[];
}

let generationIdCounter = 0;

type AppState =
  | { type: 'loading' }
  | { type: 'spinning'; generation: GenerationData; position: number }
  | { type: 'complete' };

type UndoEntry = {
  type: 'normal' | 'ghost';
  previousGeneration: GenerationData;
  previousPosition: number;
};

export default function WheelPage() {
  const router = useRouter();

  // Prompt loaded from sessionStorage
  const [prompt, setPrompt] = useState<string | null>(null);

  // Settings loaded from localStorage (read-only on this page)
  const [temperature, setTemperature] = useState(DEFAULT_TEMPERATURE);
  const [systemInstruction, setSystemInstruction] = useState(
    DEFAULT_SYSTEM_INSTRUCTION
  );

  // Wheel state
  const [builtText, setBuiltText] = useState('');
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  const [appState, setAppState] = useState<AppState>({ type: 'loading' });
  const [error, setError] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);

  // Prevent double-initialization in React strict mode
  const hasInitialized = useRef(false);

  // Refs to access latest state in callbacks
  const appStateRef = useRef(appState);
  const selectedTokensRef = useRef(selectedTokens);
  const builtTextRef = useRef(builtText);
  const undoStackRef = useRef(undoStack);
  const promptRef = useRef(prompt);
  appStateRef.current = appState;
  selectedTokensRef.current = selectedTokens;
  builtTextRef.current = builtText;
  undoStackRef.current = undoStack;
  promptRef.current = prompt;

  // Extract generation data and position from state
  const generation = appState.type === 'spinning' ? appState.generation : null;
  const currentPosition = appState.type === 'spinning' ? appState.position : 0;

  const currentChosenToken = generation?.tokens[currentPosition] ?? '';
  const currentLogprobs =
    generation?.logprobsByPosition[currentPosition] ?? null;

  // Generate new tokens from the API
  const generate = useCallback(
    async (inputPrompt: string) => {
      setAppState({ type: 'loading' });
      setError(null);

      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: inputPrompt,
            maxTokens: 50,
            temperature,
            systemInstruction,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          const errorMsg =
            data.userMessage || data.error || 'Generation failed';
          const details = data.details ? ` (${data.details})` : '';
          throw new Error(errorMsg + details);
        }

        return {
          id: ++generationIdCounter,
          tokens: data.tokens,
          logprobsByPosition: data.logprobsByPosition,
        } as GenerationData;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        return null;
      }
    },
    [temperature, systemInstruction]
  );

  // Load prompt from sessionStorage and settings from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined' || hasInitialized.current) return;
    hasInitialized.current = true;

    // Load settings from localStorage
    const savedTemp = localStorage.getItem(STORAGE_KEYS.TEMPERATURE);
    if (savedTemp !== null) {
      setTemperature(parseFloat(savedTemp));
    }
    const savedInstruction = localStorage.getItem(
      STORAGE_KEYS.SYSTEM_INSTRUCTION
    );
    if (savedInstruction !== null) {
      setSystemInstruction(savedInstruction);
    }

    // Load prompt from sessionStorage
    const savedPrompt = sessionStorage.getItem(STORAGE_KEYS.PROMPT);
    if (!savedPrompt) {
      // No prompt, redirect to home
      router.replace('/');
      return;
    }

    setPrompt(savedPrompt);
    setBuiltText(savedPrompt);
  }, [router]);

  // Auto-trigger generation when prompt loads
  useEffect(() => {
    if (prompt && appState.type === 'loading' && selectedTokens.length === 0) {
      generate(prompt).then((gen) => {
        if (gen) {
          setAppState({ type: 'spinning', generation: gen, position: 0 });
        }
      });
    }
  }, [prompt, appState.type, selectedTokens.length, generate]);

  // Handle token selection from the wheel
  const handleTokenSelect = useCallback(
    async (token: string) => {
      const currentAppState = appStateRef.current;
      if (currentAppState.type !== 'spinning') return;

      const { generation: gen, position } = currentAppState;
      const chosenToken = gen.tokens[position];

      if (token === chosenToken) {
        // Token matches AI choice - proceed normally
        const currentSelectedTokens = selectedTokensRef.current;
        const currentBuiltText = builtTextRef.current;
        const newSelectedTokens = [...currentSelectedTokens, token];
        const newBuiltText = stitchToken(currentBuiltText, token);

        setUndoStack((prev) => [
          ...prev,
          {
            type: 'normal',
            previousGeneration: gen,
            previousPosition: position,
          },
        ]);
        setSelectedTokens(newSelectedTokens);
        setBuiltText(newBuiltText);

        if (position + 1 >= gen.tokens.length) {
          setAppState({ type: 'complete' });
        } else {
          setAppState({
            type: 'spinning',
            generation: gen,
            position: position + 1,
          });
        }
      } else {
        // Token differs from AI choice - regenerate from this point
        const currentSelectedTokens = selectedTokensRef.current;
        const currentBuiltText = builtTextRef.current;
        const newSelectedTokens = [...currentSelectedTokens, token];
        const newBuiltText = stitchToken(currentBuiltText, token);
        const newPrompt = newBuiltText;

        setUndoStack((prev) => [
          ...prev,
          {
            type: 'ghost',
            previousGeneration: gen,
            previousPosition: position,
          },
        ]);

        const newGen = await generate(newPrompt);
        if (newGen) {
          setSelectedTokens(newSelectedTokens);
          setBuiltText(newBuiltText);
          setAppState({ type: 'spinning', generation: newGen, position: 0 });
        }
      }
    },
    [generate]
  );

  // Undo last token selection
  const handleUndo = useCallback(() => {
    const currentPrompt = promptRef.current;
    const currentUndoStack = undoStackRef.current;
    const currentSelectedTokens = selectedTokensRef.current;

    if (currentUndoStack.length === 0 || currentSelectedTokens.length === 0)
      return;

    const entry = currentUndoStack[currentUndoStack.length - 1];
    const newUndoStack = currentUndoStack.slice(0, -1);
    const newSelectedTokens = currentSelectedTokens.slice(0, -1);
    const newBuiltText =
      newSelectedTokens.length > 0
        ? stitchTokens(newSelectedTokens, currentPrompt || '')
        : currentPrompt || '';

    setUndoStack(newUndoStack);
    setSelectedTokens(newSelectedTokens);
    setBuiltText(newBuiltText);

    setAppState({
      type: 'spinning',
      generation: entry.previousGeneration,
      position: entry.previousPosition,
    });
  }, []);

  // Reset and go back to home
  const handleReset = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEYS.PROMPT);
    router.push('/');
  }, [router]);

  // Continue from here - save built text and go to home
  const handleContinue = useCallback(() => {
    const currentBuiltText = builtTextRef.current;
    sessionStorage.setItem(STORAGE_KEYS.PROMPT, currentBuiltText);
    router.push('/');
  }, [router]);

  // Show loading while checking for prompt
  if (prompt === null) {
    return (
      <div className="min-h-screen bg-linear-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-8 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Header />

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {appState.type === 'loading' && (
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-8 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-zinc-600 dark:text-zinc-400">
              Generating tokens...
            </p>
          </div>
        )}

        {/* Built Text Display */}
        {(appState.type === 'spinning' || appState.type === 'complete') && (
          <BuiltTextDisplay
            prompt={prompt}
            selectedTokens={selectedTokens}
            showCursor={appState.type !== 'complete'}
            showUndo={undoStack.length > 0}
            onUndo={handleUndo}
            onReset={handleReset}
          />
        )}

        {/* Token Wheel */}
        {appState.type === 'spinning' && currentLogprobs && (
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-6 mb-6">
            <TokenWheel
              key={`${generation?.id}-${currentPosition}`}
              logprobs={currentLogprobs}
              chosenToken={currentChosenToken}
              onTokenSelect={handleTokenSelect}
              currentPosition={currentPosition + 1}
              totalPositions={generation?.tokens.length}
            />
          </div>
        )}

        {/* Complete State */}
        {appState.type === 'complete' && (
          <CompletionBanner
            tokenCount={selectedTokens.length}
            onReset={handleReset}
            onContinue={handleContinue}
          />
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
          Powered by Gemini 2.0 Flash
        </div>
      </div>
    </div>
  );
}
