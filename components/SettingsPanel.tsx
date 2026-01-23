import {
  DEFAULT_TEMPERATURE,
  DEFAULT_SYSTEM_INSTRUCTION,
  TEMPERATURE_CONFIG,
} from '@/lib/constants';

interface SettingsPanelProps {
  temperature: number;
  onTemperatureChange: (temperature: number) => void;
  systemInstruction: string;
  onSystemInstructionChange: (instruction: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export default function SettingsPanel({
  temperature,
  onTemperatureChange,
  systemInstruction,
  onSystemInstructionChange,
  isOpen,
  onToggle,
  disabled,
}: SettingsPanelProps) {
  const isTemperatureDefault = temperature === DEFAULT_TEMPERATURE;
  const isSystemInstructionDefault =
    systemInstruction === DEFAULT_SYSTEM_INSTRUCTION;
  const temperaturePercent =
    ((temperature - TEMPERATURE_CONFIG.min) /
      (TEMPERATURE_CONFIG.max - TEMPERATURE_CONFIG.min)) *
    100;

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-100 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-6 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
      >
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Settings
        </span>
        <svg
          className={`h-5 w-5 text-zinc-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="border-t border-zinc-100 px-6 pb-4 dark:border-zinc-800">
          {/* Temperature Slider */}
          <div className="pt-4">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Temperature:{' '}
                <span className="text-zinc-500 dark:text-zinc-400">
                  {temperature.toFixed(2)}
                </span>
              </label>
              {!isTemperatureDefault && (
                <button
                  onClick={() => onTemperatureChange(DEFAULT_TEMPERATURE)}
                  disabled={disabled}
                  className="text-xs text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Reset
                </button>
              )}
            </div>
            <input
              type="range"
              min={TEMPERATURE_CONFIG.min}
              max={TEMPERATURE_CONFIG.max}
              step={TEMPERATURE_CONFIG.step}
              value={temperature}
              onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
              disabled={disabled}
              style={{
                background: `linear-gradient(to right, var(--range-fill) 0%, var(--range-fill) ${temperaturePercent}%, var(--range-track) ${temperaturePercent}%, var(--range-track) 100%)`,
              }}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg accent-blue-600 [--range-fill:#2563eb] [--range-track:#e5e7eb] disabled:cursor-not-allowed disabled:opacity-50 dark:[--range-fill:#60a5fa] dark:[--range-track:#3f3f46]"
            />
            <div className="mt-2 flex justify-between text-xs text-zinc-400 dark:text-zinc-500">
              <span>Precise</span>
              <span>Creative</span>
            </div>
          </div>

          {/* System Instruction */}
          <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <div className="flex items-center justify-between text-sm font-medium text-zinc-700 dark:text-zinc-300">
              <span>
                System Instruction
                {!isSystemInstructionDefault && (
                  <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                    (modified)
                  </span>
                )}
              </span>
              {!isSystemInstructionDefault && (
                <button
                  onClick={() =>
                    onSystemInstructionChange(DEFAULT_SYSTEM_INSTRUCTION)
                  }
                  disabled={disabled}
                  className="text-xs text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Reset
                </button>
              )}
            </div>
            <div className="mt-3">
              <textarea
                value={systemInstruction}
                onChange={(e) => onSystemInstructionChange(e.target.value)}
                disabled={disabled}
                rows={8}
                className="w-full resize-y rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                placeholder="Enter system instruction..."
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
