import { GoogleGenerativeAI } from '@google/generative-ai';
import { DEFAULT_SYSTEM_INSTRUCTION } from './constants';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Custom error class for safety blocks
export class SafetyBlockError extends Error {
  reason: string;

  constructor(reason: string) {
    super(`Content blocked due to: ${reason}`);
    this.name = 'SafetyBlockError';
    this.reason = reason;
  }
}

export interface GenerationOptions {
  prompt: string;
  systemInstruction?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  numLogprobs?: number;
}

export interface GenerationResult {
  text: string;
  tokens: string[];
  logprobsByPosition: Record<string, number>[];
}

export async function generateWithLogprobs({
  prompt,
  systemInstruction,
  maxTokens = 50,
  temperature = 0.9,
  topP = 0.95,
  topK = 40,
  numLogprobs = 8,
}: GenerationOptions): Promise<GenerationResult> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
  });

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature,
      topP,
      topK,
      maxOutputTokens: maxTokens,
      responseLogprobs: true,
      logprobs: numLogprobs,
    },
    systemInstruction: systemInstruction || DEFAULT_SYSTEM_INSTRUCTION,
  });

  const response = result.response;

  // CRITICAL: Check for safety blocks BEFORE accessing text()
  // Gemini returns 200 OK but with no content when blocked
  if (response.promptFeedback?.blockReason) {
    throw new SafetyBlockError(response.promptFeedback.blockReason);
  }

  // Check if any candidates were returned
  if (!response.candidates || response.candidates.length === 0) {
    throw new Error('No content generated - empty response from Gemini');
  }

  const candidate = response.candidates[0];

  // Check finish reason - generation may have stopped due to safety
  if (candidate.finishReason === 'SAFETY') {
    throw new SafetyBlockError('Generation stopped by safety filter');
  }

  // Now safe to access logprobs and text
  const logprobsResult = candidate.logprobsResult;

  if (!logprobsResult || !logprobsResult.chosenCandidates) {
    throw new Error('No logprobs returned - check API configuration');
  }

  // Extract tokens
  const tokens = logprobsResult.chosenCandidates.map((c) => c.token);

  // Extract logprobs by position
  const logprobsByPosition = logprobsResult.topCandidates.map(
    (positionData) => {
      // Convert to object: { token: probability }
      const probsAtPosition: Record<string, number> = {};
      positionData.candidates.forEach((c) => {
        probsAtPosition[c.token] = Math.exp(c.logProbability);
      });

      // Normalize to ensure sum = 1.0
      const total = Object.values(probsAtPosition).reduce(
        (sum, p) => sum + p,
        0
      );
      const normalized: Record<string, number> = {};
      Object.entries(probsAtPosition).forEach(([token, prob]) => {
        normalized[token] = prob / total;
      });

      return normalized;
    }
  );

  return {
    text: response.text(),
    tokens,
    logprobsByPosition,
  };
}
