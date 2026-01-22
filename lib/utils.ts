/**
 * Token Stitching Utilities
 *
 * Gemini tokens already include proper spacing (e.g., " mat" has a leading
 * space for word boundaries, "ing" has no space for continuations).
 * We simply concatenate tokens directly.
 */

/**
 * Appends a token to context.
 * Gemini tokens already include proper spacing, so we just concatenate.
 * @param context - The existing text
 * @param token - The token to append
 * @returns The combined text
 */
export function stitchToken(context: string, token: string): string {
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
