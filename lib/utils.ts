/**
 * Token Stitching Utilities
 *
 * Handles the complexity of joining tokens into readable text.
 * Gemini tokens may or may not include leading spaces.
 */

/**
 * Determines if a space is needed between context and new token.
 * @param context - The existing text
 * @param token - The token to append
 * @returns Whether to insert a space
 */
function needsSpaceBefore(context: string, token: string): boolean {
  // If token already starts with space, no need to add one
  if (token.startsWith(' ') || token.startsWith('\n')) {
    return false;
  }

  // If context is empty, no space needed
  if (!context || context.length === 0) {
    return false;
  }

  const lastChar = context[context.length - 1];

  // No space after these characters
  const noSpaceAfter = [' ', '\n', '\t', '(', '[', '{', '"', "'", '-'];
  if (noSpaceAfter.includes(lastChar)) {
    return false;
  }

  // No space before punctuation
  const punctuation = ['.', ',', '!', '?', ':', ';', ')', ']', '}', '"', "'"];
  if (punctuation.includes(token[0])) {
    return false;
  }

  // Otherwise, we need a space
  return true;
}

/**
 * Appends a token to context with smart spacing.
 * @param context - The existing text
 * @param token - The token to append
 * @returns The combined text
 */
export function stitchToken(context: string, token: string): string {
  if (needsSpaceBefore(context, token)) {
    return context + ' ' + token;
  }
  return context + token;
}

/**
 * Stitches an array of tokens into a single string.
 * @param tokens - Array of tokens
 * @param initialContext - Optional starting context
 * @returns The combined text
 */
export function stitchTokens(tokens: string[], initialContext: string = ''): string {
  return tokens.reduce((text, token) => stitchToken(text, token), initialContext);
}

/**
 * Formats a token for display on a wheel wedge.
 * Trims whitespace but shows special characters visually.
 * @param token - The raw token
 * @returns Display-friendly version
 */
export function formatTokenForDisplay(token: string): string {
  // Handle special tokens
  if (token === '\n') return '↵';
  if (token === '\t') return '→';
  if (token === ' ') return '␣';

  // Trim leading/trailing whitespace for display
  const trimmed = token.trim();

  // If token was only whitespace, show a symbol
  if (trimmed === '') {
    return '␣';
  }

  return trimmed;
}

/**
 * Converts logprobs object to wheel wedge data with angles.
 * @param logprobs - Object with token keys and probability values
 * @returns Array of wedge data sorted by probability (highest first)
 */
export function convertLogprobsToWedges(logprobs: Record<string, number>): {
  token: string;
  probability: number;
  angle: number;
  startAngle: number;
  endAngle: number;
}[] {
  // Sort by probability (highest first)
  const sorted = Object.entries(logprobs)
    .map(([token, probability]) => ({ token, probability }))
    .sort((a, b) => b.probability - a.probability);

  // Calculate angles
  let currentAngle = 0;
  return sorted.map(({ token, probability }) => {
    const angle = probability * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    return {
      token,
      probability,
      angle,
      startAngle,
      endAngle
    };
  });
}
