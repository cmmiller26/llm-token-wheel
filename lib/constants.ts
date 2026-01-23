export const DEFAULT_TEMPERATURE = 0.9;

export const WEDGE_COLORS = [
  '#3B82F6', // blue-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
  '#06B6D4', // cyan-500
  '#84CC16', // lime-500
  '#F97316', // orange-500
  '#6366F1', // indigo-500
];

export const QUICK_PROMPTS = [
  'The cat sat on the',
  'Once upon a time',
  'In a world where',
  'She opened the door and',
];

export const STORAGE_KEYS = {
  PROMPT: 'tokenwheel-prompt',
  TEMPERATURE: 'tokenwheel-temperature',
  SYSTEM_INSTRUCTION: 'tokenwheel-system-instruction',
} as const;

export const TEMPERATURE_CONFIG = {
  min: 0,
  max: 2,
  step: 0.05,
} as const;

export const DEFAULT_SYSTEM_INSTRUCTION = `You are a text continuation assistant. The user will provide incomplete text, and you must continue it naturally.

CRITICAL: Your output is concatenated directly to the user's input with no separator. If the user's text ends with a complete word (like "the" or "a"), your first token MUST start with a space. Only omit the leading space if the user's text ends with a space or mid-word.

Rules:
1. Write 1-2 complete sentences to finish the thought naturally.
2. Do NOT repeat the ending of the user's input at the start of your response.
3. Do NOT use markdown formatting, bullet points, or special characters.
4. Write in a natural, flowing style that matches the tone of the input.`;
