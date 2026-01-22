"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import TokenWheel from "@/components/TokenWheel";
import PromptInput from "@/components/PromptInput";
import SettingsPanel from "@/components/SettingsPanel";
import BuiltTextDisplay from "@/components/BuiltTextDisplay";
import GhostConfirmation from "@/components/GhostConfirmation";
import CompletionBanner from "@/components/CompletionBanner";
import { stitchToken, stitchTokens } from "@/lib/utils";
import { DEFAULT_TEMPERATURE, DEFAULT_SYSTEM_INSTRUCTION } from "@/lib/constants";

interface GenerationData {
  id: number; // Unique ID for each generation to ensure wheel remounts
  tokens: string[];
  logprobsByPosition: Record<string, number>[];
}

// Counter for generating unique IDs
let generationIdCounter = 0;

type AppState =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "spinning"; generation: GenerationData; position: number }
  | {
      type: "ghost";
      generation: GenerationData;
      position: number;
      ghostToken: string;
    }
  | { type: "complete" };

type UndoEntry = {
  type: "normal" | "ghost";
  previousGeneration: GenerationData;
  previousPosition: number;
};

export default function Home() {
  // Core state
  const [prompt, setPrompt] = useState("The cat sat on the");
  const [builtText, setBuiltText] = useState("");
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  const [appState, setAppState] = useState<AppState>({ type: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);

  // Settings state
  const [temperature, setTemperature] = useState(DEFAULT_TEMPERATURE);
  const [systemInstruction, setSystemInstruction] = useState(DEFAULT_SYSTEM_INSTRUCTION);
  const [showSettings, setShowSettings] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTemp = localStorage.getItem("tokenwheel-temperature");
      if (savedTemp !== null) {
        setTemperature(parseFloat(savedTemp));
      }
      const savedInstruction = localStorage.getItem("tokenwheel-system-instruction");
      if (savedInstruction !== null) {
        setSystemInstruction(savedInstruction);
      }
    }
  }, []);

  // Save temperature to localStorage when it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("tokenwheel-temperature", temperature.toString());
    }
  }, [temperature]);

  // Save system instruction to localStorage when it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("tokenwheel-system-instruction", systemInstruction);
    }
  }, [systemInstruction]);

  // Refs to access latest state in callbacks (avoids stale closures)
  const appStateRef = useRef(appState);
  const selectedTokensRef = useRef(selectedTokens);
  const builtTextRef = useRef(builtText);
  const undoStackRef = useRef(undoStack);
  appStateRef.current = appState;
  selectedTokensRef.current = selectedTokens;
  builtTextRef.current = builtText;
  undoStackRef.current = undoStack;

  // Extract generation data and position from state
  const generation =
    appState.type === "spinning" || appState.type === "ghost"
      ? appState.generation
      : null;
  const currentPosition =
    appState.type === "spinning" || appState.type === "ghost"
      ? appState.position
      : 0;

  // Current token at position (what Gemini chose)
  const currentChosenToken = generation?.tokens[currentPosition] ?? "";
  const currentLogprobs =
    generation?.logprobsByPosition[currentPosition] ?? null;

  // Generate new tokens from the API
  const generate = useCallback(async (inputPrompt: string) => {
    setAppState({ type: "loading" });
    setError(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: inputPrompt,
          maxTokens: 50,
          temperature,
          systemInstruction,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Include details in dev mode for debugging
        const errorMsg = data.userMessage || data.error || "Generation failed";
        const details = data.details ? ` (${data.details})` : "";
        throw new Error(errorMsg + details);
      }

      return {
        id: ++generationIdCounter,
        tokens: data.tokens,
        logprobsByPosition: data.logprobsByPosition,
      } as GenerationData;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setAppState({ type: "idle" });
      return null;
    }
  }, [temperature, systemInstruction]);

  // Start a new generation
  const handleStart = useCallback(async () => {
    if (!prompt.trim()) return;

    const gen = await generate(prompt);
    if (gen) {
      setBuiltText(prompt);
      setSelectedTokens([]);
      setUndoStack([]);
      setAppState({ type: "spinning", generation: gen, position: 0 });
    }
  }, [prompt, generate]);

  // Handle token selection from the wheel
  const handleTokenSelect = useCallback((token: string) => {
    const currentAppState = appStateRef.current;
    if (currentAppState.type !== "spinning") return;

    const { generation: gen, position } = currentAppState;
    const chosenToken = gen.tokens[position];

    if (token === chosenToken) {
      // Spin mode: Accept the AI's choice
      const currentSelectedTokens = selectedTokensRef.current;
      const currentBuiltText = builtTextRef.current;
      const newSelectedTokens = [...currentSelectedTokens, token];
      const newBuiltText = stitchToken(currentBuiltText, token);

      // Push normal entry to undo stack (save current state for instant restore)
      setUndoStack((prev) => [
        ...prev,
        { type: "normal", previousGeneration: gen, previousPosition: position },
      ]);
      setSelectedTokens(newSelectedTokens);
      setBuiltText(newBuiltText);

      // Check if we've reached the end
      if (position + 1 >= gen.tokens.length) {
        setAppState({ type: "complete" });
      } else {
        setAppState({
          type: "spinning",
          generation: gen,
          position: position + 1,
        });
      }
    } else {
      // Manual selection: Show ghost mode
      setAppState({
        type: "ghost",
        generation: gen,
        position,
        ghostToken: token,
      });
    }
  }, []);

  // Confirm ghost selection and regenerate
  const handleGhostConfirm = useCallback(async () => {
    const currentAppState = appStateRef.current;
    if (currentAppState.type !== "ghost") return;

    const { generation: prevGen, position: prevPos, ghostToken } = currentAppState;
    const currentSelectedTokens = selectedTokensRef.current;
    const currentBuiltText = builtTextRef.current;
    const newSelectedTokens = [...currentSelectedTokens, ghostToken];
    const newBuiltText = stitchToken(currentBuiltText, ghostToken);
    const newPrompt = newBuiltText;

    // Save current generation state before overriding (for instant undo)
    setUndoStack((prev) => [
      ...prev,
      { type: "ghost", previousGeneration: prevGen, previousPosition: prevPos },
    ]);

    // Generate from the new context
    const gen = await generate(newPrompt);
    if (gen) {
      setSelectedTokens(newSelectedTokens);
      setBuiltText(newBuiltText);
      setAppState({ type: "spinning", generation: gen, position: 0 });
    }
  }, [generate]);

  // Cancel ghost selection
  const handleGhostCancel = useCallback(() => {
    const currentAppState = appStateRef.current;
    if (currentAppState.type !== "ghost") return;
    const { generation: gen, position } = currentAppState;
    setAppState({ type: "spinning", generation: gen, position });
  }, []);

  // Undo last token selection
  const handleUndo = useCallback(() => {
    const currentAppState = appStateRef.current;

    // If in ghost mode, just cancel it (don't undo a token)
    if (currentAppState.type === "ghost") {
      const { generation: gen, position } = currentAppState;
      setAppState({ type: "spinning", generation: gen, position });
      return;
    }

    const currentUndoStack = undoStackRef.current;
    const currentSelectedTokens = selectedTokensRef.current;

    if (currentUndoStack.length === 0 || currentSelectedTokens.length === 0)
      return;

    const entry = currentUndoStack[currentUndoStack.length - 1];
    const newUndoStack = currentUndoStack.slice(0, -1);
    const newSelectedTokens = currentSelectedTokens.slice(0, -1);
    const newBuiltText =
      newSelectedTokens.length > 0
        ? stitchTokens(newSelectedTokens, prompt)
        : prompt;

    setUndoStack(newUndoStack);
    setSelectedTokens(newSelectedTokens);
    setBuiltText(newBuiltText);

    // Instant restore - no API call needed for either type
    setAppState({
      type: "spinning",
      generation: entry.previousGeneration,
      position: entry.previousPosition,
    });
  }, [prompt]);

  // Reset to start over
  const handleReset = useCallback(() => {
    setBuiltText("");
    setSelectedTokens([]);
    setAppState({ type: "idle" });
    setError(null);
    setUndoStack([]);
  }, []);

  // Get the text to display (including ghost token if in ghost mode)
  const displayText =
    appState.type === "ghost"
      ? stitchToken(builtText, appState.ghostToken)
      : builtText;

  return (
    <div className="min-h-screen bg-linear-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
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
        {appState.type === "idle" && (
          <>
            <PromptInput
              prompt={prompt}
              onPromptChange={setPrompt}
              onStart={handleStart}
            />
            <SettingsPanel
              temperature={temperature}
              onTemperatureChange={setTemperature}
              systemInstruction={systemInstruction}
              onSystemInstructionChange={setSystemInstruction}
              isOpen={showSettings}
              onToggle={() => setShowSettings(!showSettings)}
            />
          </>
        )}

        {/* Loading State */}
        {appState.type === "loading" && (
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-8 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-zinc-600 dark:text-zinc-400">
              Generating tokens...
            </p>
          </div>
        )}

        {/* Built Text Display */}
        {(appState.type === "spinning" ||
          appState.type === "ghost" ||
          appState.type === "complete") && (
          <BuiltTextDisplay
            prompt={prompt}
            selectedTokens={selectedTokens}
            ghostToken={
              appState.type === "ghost" ? appState.ghostToken : undefined
            }
            showCursor={appState.type !== "complete"}
          />
        )}

        {/* Ghost Mode Confirmation */}
        {appState.type === "ghost" && (
          <GhostConfirmation
            ghostToken={appState.ghostToken}
            onConfirm={handleGhostConfirm}
            onCancel={handleGhostCancel}
          />
        )}

        {/* Token Wheel */}
        {appState.type === "spinning" && currentLogprobs && (
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-6 mb-6">
            <div className="text-center mb-4">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Position {currentPosition + 1} of {generation?.tokens.length}
              </span>
            </div>
            <TokenWheel
              key={`${generation?.id}-${currentPosition}`}
              logprobs={currentLogprobs}
              chosenToken={currentChosenToken}
              onTokenSelect={handleTokenSelect}
            />
          </div>
        )}

        {/* Complete State */}
        {appState.type === "complete" && (
          <CompletionBanner
            tokenCount={selectedTokens.length}
            onReset={handleReset}
            onContinue={() => {
              setPrompt(displayText);
              handleReset();
            }}
          />
        )}

        {/* Controls */}
        {(appState.type === "spinning" ||
          appState.type === "ghost" ||
          appState.type === "complete") && (
          <div className="text-center space-x-4">
            {undoStack.length > 0 && (
              <button
                onClick={handleUndo}
                className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 underline"
              >
                Undo
              </button>
            )}
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
          {" · "}
          Powered by Gemini 2.0 Flash
        </div>
      </div>
    </div>
  );
}
