'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TokenWheel, { TokenWheelHandle } from '@/components/wheel/TokenWheel';
import TokenLegend from '@/components/wheel/TokenLegend';
import BuiltTextDisplay from '@/components/wheel/BuiltTextDisplay';
import CompletionBanner from '@/components/wheel/CompletionBanner';
import Header from '@/components/Header';
import { stitchToken, stitchTokens, WedgeData } from '@/lib/utils';
import {
  DEFAULT_TEMPERATURE,
  DEFAULT_SYSTEM_INSTRUCTION,
  STORAGE_KEYS,
} from '@/lib/constants';
import Footer from '@/components/Footer';
import ErrorDisplay from '@/components/wheel/ErrorDisplay';
import { LoadingState } from '@/components/wheel/LoadingState';

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

interface PendingRegeneration {
  token: string;
  newBuiltText: string;
  newSelectedTokens: string[];
  promise: Promise<GenerationData | null>;
  resolved: boolean;
  result: GenerationData | null;
  error: string | null;
}

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
  const [pendingRegen, setPendingRegen] = useState<PendingRegeneration | null>(
    null
  );

  // Prevent double-initialization in React strict mode
  const hasInitialized = useRef(false);

  // TokenWheel ref for imperative control
  const wheelRef = useRef<TokenWheelHandle>(null);

  // State for coordinating with TokenLegend
  const [legendWedges, setLegendWedges] = useState<WedgeData[]>([]);
  const [legendSelectedToken, setLegendSelectedToken] = useState<string | null>(
    null
  );

  // Refs to access latest state in callbacks
  const appStateRef = useRef(appState);
  const selectedTokensRef = useRef(selectedTokens);
  const builtTextRef = useRef(builtText);
  const undoStackRef = useRef(undoStack);
  const promptRef = useRef(prompt);
  const pendingRegenRef = useRef(pendingRegen);
  appStateRef.current = appState;
  selectedTokensRef.current = selectedTokens;
  builtTextRef.current = builtText;
  undoStackRef.current = undoStack;
  promptRef.current = prompt;
  pendingRegenRef.current = pendingRegen;

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

  // Speculative generation - same as generate() but doesn't set loading state
  const generateSpeculative = useCallback(
    async (inputPrompt: string): Promise<GenerationData | null> => {
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
        throw new Error(message);
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

  // Handle diverging token click - start speculative regeneration immediately
  const handleDivergingTokenClick = useCallback(
    (token: string) => {
      const currentAppState = appStateRef.current;
      if (currentAppState.type !== 'spinning') return;

      const { generation: gen, position } = currentAppState;
      const chosenToken = gen.tokens[position];

      // Only start speculative regeneration for diverging tokens
      if (token === chosenToken) return;

      // Pre-compute new state
      const currentSelectedTokens = selectedTokensRef.current;
      const currentBuiltText = builtTextRef.current;
      const newSelectedTokens = [...currentSelectedTokens, token];
      const newBuiltText = stitchToken(currentBuiltText, token);
      const newPrompt = newBuiltText;

      // Start speculative API call
      const promise = generateSpeculative(newPrompt);

      // Create pending state
      const pending: PendingRegeneration = {
        token,
        newBuiltText,
        newSelectedTokens,
        promise,
        resolved: false,
        result: null,
        error: null,
      };

      setPendingRegen(pending);

      // Track promise resolution
      promise
        .then((result) => {
          // Update pending state when resolved
          setPendingRegen((current) => {
            // Only update if this is still the same pending request
            if (current && current.token === token) {
              return { ...current, resolved: true, result, error: null };
            }
            return current;
          });
        })
        .catch((err) => {
          const message = err instanceof Error ? err.message : 'Unknown error';
          setPendingRegen((current) => {
            if (current && current.token === token) {
              return { ...current, resolved: true, result: null, error: message };
            }
            return current;
          });
        });
    },
    [generateSpeculative]
  );

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
        // Token differs from AI choice - check for pending speculative result
        const pending = pendingRegenRef.current;

        setUndoStack((prev) => [
          ...prev,
          {
            type: 'ghost',
            previousGeneration: gen,
            previousPosition: position,
          },
        ]);

        if (pending && pending.token === token && pending.resolved) {
          // Speculative call finished - use cached result immediately
          setPendingRegen(null);

          if (pending.error) {
            // Speculative call failed - show error
            setError(pending.error);
            setAppState({ type: 'loading' });
          } else if (pending.result) {
            // Use cached result - no loading state!
            setSelectedTokens(pending.newSelectedTokens);
            setBuiltText(pending.newBuiltText);
            setAppState({
              type: 'spinning',
              generation: pending.result,
              position: 0,
            });
          }
        } else if (pending && pending.token === token && !pending.resolved) {
          // Speculative call still in progress - show loading, await existing promise
          setAppState({ type: 'loading' });
          setPendingRegen(null);

          try {
            const result = await pending.promise;
            if (result) {
              setSelectedTokens(pending.newSelectedTokens);
              setBuiltText(pending.newBuiltText);
              setAppState({ type: 'spinning', generation: result, position: 0 });
            }
          } catch (err) {
            const message =
              err instanceof Error ? err.message : 'Unknown error';
            setError(message);
          }
        } else {
          // No pending speculative call or different token - fallback to normal flow
          setPendingRegen(null);

          const currentSelectedTokens = selectedTokensRef.current;
          const currentBuiltText = builtTextRef.current;
          const newSelectedTokens = [...currentSelectedTokens, token];
          const newBuiltText = stitchToken(currentBuiltText, token);
          const newPrompt = newBuiltText;

          const newGen = await generate(newPrompt);
          if (newGen) {
            setSelectedTokens(newSelectedTokens);
            setBuiltText(newBuiltText);
            setAppState({ type: 'spinning', generation: newGen, position: 0 });
          }
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

    // Clear any pending speculative regeneration
    setPendingRegen(null);

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

  // Handle legend token click - trigger wheel's wedge click
  const handleLegendClick = useCallback((token: string) => {
    wheelRef.current?.triggerWedgeClick(token);
  }, []);

  return (
    <div className="mx-auto min-h-screen max-w-3xl bg-zinc-50 dark:bg-zinc-950">
      <Header />

      <div className="flex flex-col gap-4">
        {prompt === null ? (
          <LoadingState />
        ) : (
          <>
            {/* Error Display */}
            {error && <ErrorDisplay message={error} />}

            {/* Loading State */}
            {appState.type === 'loading' && (
              <LoadingState message="Generating tokens..." />
            )}

            {/* Built Text Display - spans full width */}
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

            {/* Token Wheel and Legend - side by side on large screens */}
            {appState.type === 'spinning' && currentLogprobs && (
              <div className="flex flex-col gap-4 lg:flex-row">
                <TokenWheel
                  ref={wheelRef}
                  key={`${generation?.id}-${currentPosition}`}
                  logprobs={currentLogprobs}
                  chosenToken={currentChosenToken}
                  onTokenSelect={handleTokenSelect}
                  onSelectedTokenChange={setLegendSelectedToken}
                  onWedgesChange={setLegendWedges}
                  onDivergingTokenClick={handleDivergingTokenClick}
                  currentPosition={currentPosition + 1}
                  totalPositions={generation?.tokens.length}
                />
                <TokenLegend
                  wedges={legendWedges}
                  selectedToken={legendSelectedToken}
                  onTokenClick={handleLegendClick}
                  disabled={appState.type !== 'spinning'}
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
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
