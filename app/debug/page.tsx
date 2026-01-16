"use client";

import { useState } from "react";
import GenerationForm from "@/components/debug/GenerationForm";
import SimulationPanel from "@/components/debug/SimulationPanel";
import TokenVisualization from "@/components/debug/TokenVisualization";
import ApiHistory from "@/components/debug/ApiHistory";

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

interface HistoryItem {
  prompt: string;
  response: GenerationResponse;
  timestamp: Date;
  responseTime: number;
}

export default function DebugPage() {
  // Form state
  const [prompt, setPrompt] = useState("The cat sat on the");
  const [systemInstruction, setSystemInstruction] = useState("");
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
  const [history, setHistory] = useState<HistoryItem[]>([]);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    const startTime = Date.now();

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        setHistory((prev) =>
          [
            {
              prompt,
              response: data,
              timestamp: new Date(),
              responseTime: elapsed,
            },
            ...prev,
          ].slice(0, 10)
        );
      }
    } catch (err) {
      setError({
        error: "Network error",
        details: err instanceof Error ? err.message : "Unknown error",
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
    const newPrompt = prompt + newSelectedTokens.join("");

    setLoading(true);
    setError(null);
    const startTime = Date.now();

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
          generatedText: newSelectedTokens.join("") + newResponse.generatedText,
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
        error: "Network error during regeneration",
        details: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }

  function getCurrentCandidates() {
    if (!response?.logprobsByPosition[currentPosition]) return [];

    return Object.entries(response.logprobsByPosition[currentPosition])
      .map(([token, probability]) => ({ token, probability }))
      .sort((a, b) => b.probability - a.probability);
  }

  function formatToken(token: string): string {
    return token.replace(/\n/g, "↵").replace(/\t/g, "→").replace(/ /g, "·");
  }

  function handleHistorySelect(item: HistoryItem) {
    setPrompt(item.prompt);
    setResponse(item.response);
    setResponseTime(item.responseTime);
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
            Test Gemini API integration, verify token structure, and inspect
            logprobs.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Input Form */}
          <GenerationForm
            prompt={prompt}
            onPromptChange={setPrompt}
            systemInstruction={systemInstruction}
            onSystemInstructionChange={setSystemInstruction}
            maxTokens={maxTokens}
            onMaxTokensChange={setMaxTokens}
            temperature={temperature}
            onTemperatureChange={setTemperature}
            topP={topP}
            onTopPChange={setTopP}
            topK={topK}
            onTopKChange={setTopK}
            numLogprobs={numLogprobs}
            onNumLogprobsChange={setNumLogprobs}
            showAdvanced={showAdvanced}
            onShowAdvancedChange={setShowAdvanced}
            onGenerate={handleGenerate}
            loading={loading}
            responseTime={responseTime}
          />

          {/* Right Column: Response Display */}
          <div className="space-y-6">
            {/* Error Display */}
            {error && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <h3 className="font-medium text-red-800 dark:text-red-200 mb-2">
                  Error
                </h3>
                <p className="text-red-700 dark:text-red-300 text-sm">
                  {error.error}
                </p>
                {error.reason && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                    Reason: {error.reason}
                  </p>
                )}
                {error.userMessage && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                    {error.userMessage}
                  </p>
                )}
                {error.details && (
                  <p className="text-red-500 dark:text-red-500 text-xs mt-2 font-mono">
                    {error.details}
                  </p>
                )}
              </div>
            )}

            {/* Generated Text */}
            {response && (
              <>
                <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                      Generated Text
                    </h3>
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
                    <span className="text-green-600 dark:text-green-400 font-semibold">
                      {response.generatedText}
                    </span>
                  </div>
                </div>

                {/* Simulation Mode Panel */}
                {simulationMode && (
                  <SimulationPanel
                    prompt={prompt}
                    selectedTokens={selectedTokens}
                    currentPosition={currentPosition}
                    totalTokens={response.tokens.length}
                    simulationComplete={simulationComplete}
                    currentToken={response.tokens[currentPosition]}
                    candidates={getCurrentCandidates()}
                    loading={loading}
                    onExit={exitSimulation}
                    onAccept={acceptCurrentToken}
                    onSelectAlternative={selectAlternativeToken}
                    onRestart={startSimulation}
                    formatToken={formatToken}
                  />
                )}

                {/* Token Visualization */}
                <TokenVisualization
                  tokens={response.tokens}
                  logprobsByPosition={response.logprobsByPosition}
                  formatToken={formatToken}
                  onCopyTokens={() =>
                    copyToClipboard(JSON.stringify(response.tokens, null, 2))
                  }
                  onCopyLogprobs={() =>
                    copyToClipboard(
                      JSON.stringify(response.logprobsByPosition, null, 2)
                    )
                  }
                />

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
        <ApiHistory history={history} onSelectItem={handleHistorySelect} />

        {/* Testing Guide */}
        <div className="mt-8 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <h3 className="font-medium text-amber-800 dark:text-amber-200 mb-2">
            Testing Guide
          </h3>
          <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
            <li>
              <strong>Token Spacing:</strong> Check if tokens include leading
              spaces (shown as ·). First continuation token behavior may vary.
            </li>
            <li>
              <strong>System Instructions:</strong> Override the system
              instruction to test different continuation behaviors.
            </li>
            <li>
              <strong>Spin Mode Validation:</strong> The tokens array +
              logprobsByPosition support stepping through without re-generation.
            </li>
            <li>
              <strong>Manual Selection:</strong> When user picks a different
              token than chosen, only then do we need to regenerate.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
