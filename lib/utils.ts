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
export function stitchTokens(
  tokens: string[],
  initialContext: string = ''
): string {
  return tokens.reduce(
    (text, token) => stitchToken(text, token),
    initialContext
  );
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
 * Wedge data structure for wheel segments
 */
export interface WedgeData {
  token: string;
  probability: number;
  angle: number;
  startAngle: number;
  endAngle: number;
}

/**
 * Converts logprobs object to wheel wedge data with angles.
 * @param logprobs - Object with token keys and probability values
 * @returns Array of wedge data sorted by probability (highest first)
 */
export function convertLogprobsToWedges(
  logprobs: Record<string, number>
): WedgeData[] {
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
      endAngle,
    };
  });
}

/**
 * Creates an SVG arc path for a wheel wedge
 * Handles the special case of near-360-degree wedges (100% probability)
 */
export function createWedgePath(
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const angle = endAngle - startAngle;

  // For near-full circles (>= 359 degrees), draw a circle
  // SVG arcs can't draw from a point to itself, so we use two semicircles
  if (angle >= 359) {
    return `M ${centerX - radius} ${centerY}
            A ${radius} ${radius} 0 1 1 ${centerX + radius} ${centerY}
            A ${radius} ${radius} 0 1 1 ${centerX - radius} ${centerY} Z`;
  }

  // Convert angles to radians (SVG uses clockwise from 3 o'clock, we want from 12 o'clock)
  const startRad = ((startAngle - 90) * Math.PI) / 180;
  const endRad = ((endAngle - 90) * Math.PI) / 180;

  const x1 = centerX + radius * Math.cos(startRad);
  const y1 = centerY + radius * Math.sin(startRad);
  const x2 = centerX + radius * Math.cos(endRad);
  const y2 = centerY + radius * Math.sin(endRad);

  // Large arc flag: 1 if angle > 180 degrees
  const largeArcFlag = angle > 180 ? 1 : 0;

  return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
}

/**
 * Calculates the rotation needed to land on a specific wedge
 * The pointer is at the TOP (0 degrees), so we need to rotate the wheel
 * so that the target wedge's center aligns with the top.
 */
export function calculateTargetRotation(
  wedges: WedgeData[],
  targetToken: string,
  currentRotation: number
): number {
  const targetWedge = wedges.find((w) => w.token === targetToken);
  if (!targetWedge) {
    console.warn('Target token not found in wedges:', targetToken);
    return currentRotation;
  }

  // Calculate center of the target wedge (in wheel coordinates, starting from top)
  const wedgeCenterAngle = (targetWedge.startAngle + targetWedge.endAngle) / 2;

  // To land at the top (0 degrees), we need to rotate so the wedge center goes to 0
  // Since wedges start from 0 and go clockwise, we rotate by (360 - wedgeCenterAngle)
  // But we also need to account for the current rotation to find the delta
  const normalizedCurrent = currentRotation % 360;
  const targetAngle = 360 - wedgeCenterAngle;

  // Calculate the shortest rotation delta (always go forward)
  let rotationDelta = targetAngle - normalizedCurrent;
  if (rotationDelta <= 0) {
    rotationDelta += 360;
  }

  // Add multiple full rotations for dramatic spin effect (10-13 rotations like v1)
  const minSpins = 10;
  const randomExtraSpins = Math.floor(Math.random() * 3); // 0-2 extra spins
  const totalRotation = 360 * (minSpins + randomExtraSpins) + rotationDelta;

  return currentRotation + totalRotation;
}
