'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import PromptInput from '@/components/PromptInput';
import SettingsPanel from '@/components/SettingsPanel';
import Header from '@/components/Header';
import {
  DEFAULT_TEMPERATURE,
  DEFAULT_SYSTEM_INSTRUCTION,
  STORAGE_KEYS,
} from '@/lib/constants';
import Footer from '@/components/Footer';

// Helper to get initial temperature from localStorage
function getInitialTemperature(): number {
  if (typeof window === 'undefined') return DEFAULT_TEMPERATURE;
  const saved = localStorage.getItem(STORAGE_KEYS.TEMPERATURE);
  return saved !== null ? parseFloat(saved) : DEFAULT_TEMPERATURE;
}

// Helper to get initial system instruction from localStorage
function getInitialSystemInstruction(): string {
  if (typeof window === 'undefined') return DEFAULT_SYSTEM_INSTRUCTION;
  const saved = localStorage.getItem(STORAGE_KEYS.SYSTEM_INSTRUCTION);
  return saved !== null ? saved : DEFAULT_SYSTEM_INSTRUCTION;
}

// Helper to get initial prompt (check sessionStorage for "Continue from here" flow)
function getInitialPrompt(): string {
  if (typeof window === 'undefined') return 'The cat sat on the';
  const saved = sessionStorage.getItem(STORAGE_KEYS.PROMPT);
  if (saved) {
    // Clear it so we don't keep reloading it
    sessionStorage.removeItem(STORAGE_KEYS.PROMPT);
    return saved;
  }
  return 'The cat sat on the';
}

export default function Home() {
  const router = useRouter();
  const hasClearedPrompt = useRef(false);

  // Use lazy initialization to load from storage
  const [prompt, setPrompt] = useState(getInitialPrompt);
  const [temperature, setTemperature] = useState(getInitialTemperature);
  const [systemInstruction, setSystemInstruction] = useState(
    getInitialSystemInstruction
  );
  const [showSettings, setShowSettings] = useState(false);

  // Clear sessionStorage prompt after mount (in case lazy init didn't run on client)
  useEffect(() => {
    if (hasClearedPrompt.current) return;
    hasClearedPrompt.current = true;
    sessionStorage.removeItem(STORAGE_KEYS.PROMPT);
  }, []);

  // Save temperature to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.TEMPERATURE, temperature.toString());
    }
  }, [temperature]);

  // Save system instruction to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.SYSTEM_INSTRUCTION, systemInstruction);
    }
  }, [systemInstruction]);

  // Handle start - save prompt and navigate to wheel
  const handleStart = () => {
    if (!prompt.trim()) return;
    sessionStorage.setItem(STORAGE_KEYS.PROMPT, prompt);
    router.push('/wheel');
  };

  return (
    <div className="mx-auto min-h-screen max-w-3xl bg-zinc-50 dark:bg-zinc-950">
      <Header />

      {/* Input Section */}
      <div className="flex flex-col gap-4">
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
      </div>

      <Footer />
    </div>
  );
}
