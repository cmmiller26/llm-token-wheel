interface GenerationFormProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  systemInstruction: string;
  onSystemInstructionChange: (instruction: string) => void;
  maxTokens: number;
  onMaxTokensChange: (tokens: number) => void;
  temperature: number;
  onTemperatureChange: (temp: number) => void;
  topP: number;
  onTopPChange: (topP: number) => void;
  topK: number;
  onTopKChange: (topK: number) => void;
  numLogprobs: number;
  onNumLogprobsChange: (num: number) => void;
  showAdvanced: boolean;
  onShowAdvancedChange: (show: boolean) => void;
  onGenerate: () => void;
  loading: boolean;
  responseTime: number | null;
}

const TEST_PROMPTS = [
  'The cat sat on the',
  'Once upon a time, there was a',
  'The quick brown fox',
  'In a galaxy far, far',
  'She opened the door and saw',
];

const DEFAULT_SYSTEM_INSTRUCTION = `You are a text continuation assistant. The user will provide incomplete text, and you must continue it naturally.

CRITICAL: Your output is concatenated directly to the user's input with no separator. If the user's text ends with a complete word (like "the" or "a"), your first token MUST start with a space. Only omit the leading space if the user's text ends with a space or mid-word.

Rules:
1. Write 1-2 complete sentences to finish the thought naturally.
2. Do NOT repeat the ending of the user's input at the start of your response.
3. Do NOT use markdown formatting, bullet points, or special characters.
4. Write in a natural, flowing style that matches the tone of the input.`;

export default function GenerationForm({
  prompt,
  onPromptChange,
  systemInstruction,
  onSystemInstructionChange,
  maxTokens,
  onMaxTokensChange,
  temperature,
  onTemperatureChange,
  topP,
  onTopPChange,
  topK,
  onTopKChange,
  numLogprobs,
  onNumLogprobsChange,
  showAdvanced,
  onShowAdvancedChange,
  onGenerate,
  loading,
  responseTime,
}: GenerationFormProps) {
  return (
    <div className="space-y-6">
      {/* Prompt Input */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Prompt
        </label>
        <textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          className="w-full h-24 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md font-mono text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter your prompt..."
        />

        {/* Quick Test Prompts */}
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Quick prompts:
          </span>
          {TEST_PROMPTS.map((p, i) => (
            <button
              key={i}
              onClick={() => onPromptChange(p)}
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
          onChange={(e) => onSystemInstructionChange(e.target.value)}
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
            onChange={(e) => onMaxTokensChange(Number(e.target.value))}
            className="w-48 accent-blue-500"
          />
        </div>

        {/* Advanced Settings Toggle */}
        <button
          onClick={() => onShowAdvancedChange(!showAdvanced)}
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
                onChange={(e) => onTemperatureChange(Number(e.target.value))}
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
                onChange={(e) => onTopPChange(Number(e.target.value))}
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
                onChange={(e) => onTopKChange(Number(e.target.value))}
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
                onChange={(e) => onNumLogprobsChange(Number(e.target.value))}
                className="w-36 accent-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Generate Button */}
      <button
        onClick={onGenerate}
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
  );
}
