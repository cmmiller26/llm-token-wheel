import { useState } from 'react';
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
  const [showSystemInstruction, setShowSystemInstruction] = useState(false);
  const isTemperatureDefault = temperature === DEFAULT_TEMPERATURE;
  const isSystemInstructionDefault =
    systemInstruction === DEFAULT_SYSTEM_INSTRUCTION;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg mb-6 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-6 py-3 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
      >
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Settings
        </span>
        <svg
          className={`w-5 h-5 text-zinc-400 transition-transform ${
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
        <div className="px-6 pb-4 border-t border-zinc-100 dark:border-zinc-800">
          {/* Temperature Slider */}
          <div className="pt-4">
            <div className="flex items-center justify-between mb-2">
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
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed accent-blue-600"
            />
            <div className="flex justify-between text-xs text-zinc-400 dark:text-zinc-500 mt-1">
              <span>Precise</span>
              <span>Creative</span>
            </div>
          </div>

          {/* System Instruction */}
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              onClick={() => setShowSystemInstruction(!showSystemInstruction)}
              className="w-full flex items-center justify-between text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              <span>
                System Instruction
                {!isSystemInstructionDefault && (
                  <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                    (modified)
                  </span>
                )}
              </span>
              <svg
                className={`w-4 h-4 text-zinc-400 transition-transform ${
                  showSystemInstruction ? 'rotate-180' : ''
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

            {showSystemInstruction && (
              <div className="mt-3">
                <div className="flex justify-end mb-2">
                  {!isSystemInstructionDefault && (
                    <button
                      onClick={() =>
                        onSystemInstructionChange(DEFAULT_SYSTEM_INSTRUCTION)
                      }
                      disabled={disabled}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <textarea
                  value={systemInstruction}
                  onChange={(e) => onSystemInstructionChange(e.target.value)}
                  disabled={disabled}
                  rows={8}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed resize-y"
                  placeholder="Enter system instruction..."
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
