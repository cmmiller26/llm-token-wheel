# LLM Token Wheel - Implementation Guide

## Executive Summary

This guide provides authoritative documentation for implementing the LLM Token Wheel using Google Gemini Flash API, Next.js App Router, and Vercel serverless deployment. Based on research from official documentation, this guide ensures you understand exactly how Gemini's logprobs work and how to build the token-stepping architecture.

---

## Table of Contents

1. [Critical Understanding: How Gemini Generation Works](#critical-understanding-how-gemini-generation-works)
2. [Gemini API Integration](#gemini-api-integration)
3. [Next.js Project Structure](#nextjs-project-structure)
4. [Vercel Deployment Configuration](#vercel-deployment-configuration)
5. [Implementation Roadmap](#implementation-roadmap)
6. [Code Examples](#code-examples)

---

## Critical Understanding: How Gemini Generation Works

### The Key Insight

**Gemini completes the entire generation in ONE API call**, not token-by-token. It returns:
- The complete generated text (e.g., " floor and started purring")
- **Logprobs for EACH token position** in that generation

This means:
- ✅ You CAN step through tokens in the UI without making new API calls (Spin Mode)
- ✅ You ONLY regenerate when the user manually selects a different token
- ✅ Frontend handles token stepping with simple state management

### Token Selection Flow Architecture

**Spin Mode (Follow Gemini's Path - No Re-generation):**
```
1. User prompt: "The cat sat on the"
2. Call Gemini API ONCE
3. Gemini returns:
   - Generated text: " floor and started purring"
   - Logprobs at EACH position:
     Position 0: {" floor": -2.58, " bed": -2.73, " chair": -3.17, ...}
     Position 1: {" and": -1.45, ",": -2.12, " then": -2.43, ...}
     Position 2: {" started": -1.87, " began": -2.33, ...}
4. Display wheel for position 0 (after "the")
5. User clicks "Spin"
6. Wheel lands on " floor" (what Gemini generated)
7. Reveal " floor", show context: "The cat sat on the floor"
8. Display wheel for position 1 (after "floor")
9. User clicks "Spin" again
10. Wheel lands on " and"
11. Continue stepping through pre-generated tokens
12. NO NEW API CALLS until generation exhausted or user diverges
```

**Manual Selection Mode (Force Different Token - Requires Re-generation):**
```
1. User prompt: "The cat sat on the"
2. Call Gemini API ONCE
3. Gemini returns: " floor and started purring" + logprobs
4. Display wheel for position 0
5. User manually clicks " bed" wedge (NOT what Gemini generated)
6. GHOST MODE: Show " bed" visually in context, display "Continue?" button
7. User confirms → NOW make new Gemini API call with: "The cat sat on the bed"
8. Get new complete generation + logprobs
9. User can now step through this new path
10. Repeat if user diverges again
```

**Why Ghost Mode?** When a user clicks a wheel wedge, don't immediately trigger an API call. Instead:
1. Show the selected token appended to the context (visually)
2. Display a "Continue Generating?" confirmation button
3. Only call the API when they confirm

This prevents accidental clicks from causing 1-2 second waits and gives users a moment to reconsider their choice. It also makes the "divergence" moment feel intentional and educational.

### Implementation Logic Pseudo-code

```javascript
// Server state for current generation
let currentGeneration = {
  tokens: [" floor", " and", " started", " purring"],
  logprobsByPosition: [
    {" floor": -2.58, " bed": -2.73, " chair": -3.17, ...},
    {" and": -1.45, ",": -2.12, " then": -2.43, ...},
    {" started": -1.87, " began": -2.33, ...},
    {".": -0.56, " content": -4.21, ...}
  ],
  currentPosition: 0
};

function handleTokenSelection(userSelectedToken) {
  const geminiTokenAtPosition = currentGeneration.tokens[currentGeneration.currentPosition];

  if (userSelectedToken === geminiTokenAtPosition) {
    // Just advance to next position
    currentGeneration.currentPosition++;
    return {
      action: "advance",
      newContext: buildContext(),
      nextLogprobs: currentGeneration.logprobsByPosition[currentGeneration.currentPosition]
    };
  } else {
    // User diverged - need new generation
    const newContext = buildContext() + userSelectedToken;
    currentGeneration = await callGeminiAPI(newContext);
    currentGeneration.currentPosition = 0;
    return {
      action: "regenerate",
      newContext: newContext,
      nextLogprobs: currentGeneration.logprobsByPosition[0]
    };
  }
}
```

---

## Gemini API Integration

### 1. Installation

Using the Google Gen AI JavaScript SDK:

```bash
npm install @google/generative-ai
```

### 2. API Structure

**Request Configuration:**

```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp", // or "gemini-1.5-flash"
});

const generationConfig = {
  temperature: 0.9,           // Higher = more creative
  topP: 0.95,                 // Nucleus sampling
  topK: 40,                   // Top-k sampling
  maxOutputTokens: 20,        // Limit generation length (5-20 recommended)
  responseMimeType: "application/json", // Optional: JSON output

  // CRITICAL: Enable logprobs
  responseLogprobs: true,     // Must be true to get logprobs
  logprobs: 5                 // Number of top candidates (1-20, recommend 5-10)
};

const systemInstruction = `You are a sentence completion assistant. Your job is to naturally continue the sentence provided by the user. Do not start a new sentence. Do not repeat the prompt. Simply continue where the user left off with natural, flowing text.`;

const result = await model.generateContent({
  contents: [{ role: "user", parts: [{ text: "The cat sat on the" }] }],
  generationConfig: generationConfig,
  systemInstruction: systemInstruction
});
```

**Response Structure:**

```javascript
const response = result.response;

// Complete generated text
const generatedText = response.text();
// Example: " floor and started purring"

// Access logprobs
const candidate = response.candidates[0];
const logprobsResult = candidate.logprobsResult;

// Structure of logprobsResult:
// {
//   chosenCandidates: [
//     { token: " floor", logProbability: -2.58 },
//     { token: " and", logProbability: -1.45 },
//     { token: " started", logProbability: -1.87 },
//     { token: " purring", logProbability: -0.56 }
//   ],
//   topCandidates: [
//     {
//       candidates: [
//         { token: " floor", logProbability: -2.58 },
//         { token: " bed", logProbability: -2.73 },
//         { token: " chair", logProbability: -3.17 },
//         { token: " mat", logProbability: -3.45 },
//         { token: " couch", logProbability: -3.89 }
//       ]
//     },
//     {
//       candidates: [
//         { token: " and", logProbability: -1.45 },
//         { token: ",", logProbability: -2.12 },
//         { token: " then", logProbability: -2.43 },
//         { token: ".", logProbability: -2.87 },
//         { token: " before", logProbability: -3.21 }
//       ]
//     },
//     // ... one array per token position
//   ]
// }
```

### 3. Understanding Logprobs Structure

**Key Properties:**

- `chosenCandidates`: Array of tokens that Gemini actually generated
  - Each element: `{ token: string, logProbability: number }`
  - Index corresponds to token position in generation

- `topCandidates`: Array of arrays, one per token position
  - Each position contains top N alternative tokens (N = `logprobs` config)
  - **Includes the chosen token** plus alternatives
  - Sorted by probability (highest first)

**Converting Log Probabilities to Probabilities:**

```javascript
function convertLogprobsToWheel(topCandidatesAtPosition) {
  // topCandidatesAtPosition is array of { token, logProbability }
  const candidates = topCandidatesAtPosition.candidates;

  // Convert log probabilities to probabilities
  const withProbs = candidates.map(c => ({
    token: c.token,
    probability: Math.exp(c.logProbability) // e^(log_prob) = prob
  }));

  // Normalize to ensure sum = 1.0
  const total = withProbs.reduce((sum, c) => sum + c.probability, 0);
  const normalized = withProbs.map(c => ({
    token: c.token,
    probability: c.probability / total,
    angle: (c.probability / total) * 360 // For wheel wedge sizing
  }));

  return normalized;
}
```

### 4. System Instructions for Sentence Continuation

**Problem:** By default, Gemini may:
- Echo/repeat the user's prompt in the response
- Add markdown formatting (bold, italics)
- Start a completely new sentence instead of continuing

**Solution:** Use explicit system instructions to enforce clean continuation behavior.

**Recommended System Instruction (Tested & Verified):**

```javascript
const systemInstruction = `Continue the user's text naturally. Rules: 1) Do NOT repeat any part of the input. 2) Do NOT use markdown formatting. 3) Output only the continuation words.`;
```

**Why these specific rules matter:**
- Without rule 1: Gemini echoes "The cat sat on the" before adding "mat"
- Without rule 2: Gemini adds `**mat**` with markdown bold formatting
- Without rule 3: Gemini might add explanations or commentary

**Verified output with this instruction:**
```
Input:  "The cat sat on the"
Output: "mat."
Tokens: ["mat", ".", "\n"]
```

Clean, no echoing, no markdown - exactly what we need for the wheel.

### 5. Authentication & API Keys

**Security Best Practice:**

```javascript
// ❌ NEVER expose API key in frontend code
const apiKey = "AIzaSy..."; // NO!

// ✅ Always use environment variables in backend
const apiKey = process.env.GEMINI_API_KEY; // YES!
```

**Getting a Gemini API Key:**

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the key
4. Store in Vercel environment variables (see Vercel section)

---

## Next.js Project Structure

### Recommended Folder Structure

```
llm-token-wheel/
├── app/
│   ├── api/
│   │   └── generate/
│   │       └── route.js          # POST - Generate with logprobs
│   ├── layout.js                 # Root layout
│   └── page.js                   # Main UI page
├── lib/
│   ├── gemini.js                 # Gemini API client wrapper
│   └── utils.js                  # Helper functions (logprob conversion)
├── components/
│   ├── TokenWheel.jsx            # Wheel visualization
│   ├── PromptInput.jsx           # User input
│   └── GenerationDisplay.jsx    # Show current text
├── .env.local                    # Local env vars (DO NOT COMMIT)
├── .env.example                  # Template for env vars
├── next.config.js                # Next.js configuration
├── package.json
└── README.md
```

### API Route Implementation

**File: `app/api/generate/route.js`**

```javascript
import { NextResponse } from 'next/server';
import { generateWithLogprobs, SafetyBlockError } from '@/lib/gemini';

// Set maximum execution time (seconds)
export const maxDuration = 30;

export async function POST(request) {
  try {
    // Parse JSON body
    const { prompt, systemInstruction, maxTokens } = await request.json();

    // Validate input
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required and must be a string' },
        { status: 400 }
      );
    }

    // Optional: Basic prompt length validation
    if (prompt.length > 1000) {
      return NextResponse.json(
        { error: 'Prompt too long (max 1000 characters)' },
        { status: 400 }
      );
    }

    // Call Gemini API
    const result = await generateWithLogprobs({
      prompt,
      systemInstruction: systemInstruction || undefined,
      maxTokens: maxTokens || 20
    });

    // Return generation + logprobs
    return NextResponse.json({
      success: true,
      generatedText: result.text,
      tokens: result.tokens,
      logprobsByPosition: result.logprobsByPosition
    });

  } catch (error) {
    console.error('Generation error:', error);

    // Handle safety blocks with user-friendly message
    if (error instanceof SafetyBlockError) {
      return NextResponse.json(
        {
          error: 'Content blocked by safety filter',
          reason: error.reason,
          userMessage: 'Your prompt was flagged by the safety filter. Please try a different prompt.'
        },
        { status: 400 }
      );
    }

    // Generic error handling
    return NextResponse.json(
      {
        error: 'Failed to generate text',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
```

**File: `lib/gemini.js`**

```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Custom error class for safety blocks
export class SafetyBlockError extends Error {
  constructor(reason) {
    super(`Content blocked due to: ${reason}`);
    this.name = 'SafetyBlockError';
    this.reason = reason;
  }
}

export async function generateWithLogprobs({
  prompt,
  systemInstruction,
  maxTokens = 20,
  temperature = 0.9,
  topP = 0.95,
  topK = 40,
  numLogprobs = 8
}) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp"
  });

  const defaultSystemInstruction = `Continue the user's text naturally. Rules: 1) Do NOT repeat any part of the input. 2) Do NOT use markdown formatting. 3) Output only the continuation words.`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature,
      topP,
      topK,
      maxOutputTokens: maxTokens,
      responseLogprobs: true,
      logprobs: numLogprobs
    },
    systemInstruction: systemInstruction || defaultSystemInstruction
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
  const tokens = logprobsResult.chosenCandidates.map(c => c.token);

  // Extract logprobs by position
  const logprobsByPosition = logprobsResult.topCandidates.map(positionData => {
    // Convert to object: { token: probability }
    const probsAtPosition = {};
    positionData.candidates.forEach(c => {
      probsAtPosition[c.token] = Math.exp(c.logProbability);
    });

    // Normalize
    const total = Object.values(probsAtPosition).reduce((sum, p) => sum + p, 0);
    const normalized = {};
    Object.entries(probsAtPosition).forEach(([token, prob]) => {
      normalized[token] = prob / total;
    });

    return normalized;
  });

  return {
    text: response.text(),
    tokens,
    logprobsByPosition
  };
}
```

**File: `lib/utils.js`** - Token Stitching Utilities

Based on actual Gemini API testing, tokens behave as follows:
- Tokens often include leading spaces (e.g., `" cat"`, `" sat"`)
- First continuation token may or may NOT have a leading space
- Subword tokens (e.g., `"ing"`) have no leading space
- Punctuation is typically its own token (e.g., `"."`, `","`)

```javascript
/**
 * Token Stitching Utilities
 *
 * Handles the complexity of joining tokens into readable text.
 * Gemini tokens may or may not include leading spaces.
 */

/**
 * Determines if a space is needed between context and new token.
 * @param {string} context - The existing text
 * @param {string} token - The token to append
 * @returns {boolean} - Whether to insert a space
 */
function needsSpaceBefore(context, token) {
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
 * @param {string} context - The existing text
 * @param {string} token - The token to append
 * @returns {string} - The combined text
 */
export function stitchToken(context, token) {
  if (needsSpaceBefore(context, token)) {
    return context + ' ' + token;
  }
  return context + token;
}

/**
 * Stitches an array of tokens into a single string.
 * @param {string[]} tokens - Array of tokens
 * @param {string} initialContext - Optional starting context
 * @returns {string} - The combined text
 */
export function stitchTokens(tokens, initialContext = '') {
  return tokens.reduce((text, token) => stitchToken(text, token), initialContext);
}

/**
 * Formats a token for display on a wheel wedge.
 * Trims whitespace but shows special characters visually.
 * @param {string} token - The raw token
 * @returns {string} - Display-friendly version
 */
export function formatTokenForDisplay(token) {
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
 * Example usage:
 *
 * const context = "The cat sat on the";
 * const tokens = ["mat", ".", "\n"];
 *
 * // Building text step by step:
 * let text = context;
 * text = stitchToken(text, "mat");   // "The cat sat on the mat"
 * text = stitchToken(text, ".");     // "The cat sat on the mat."
 * text = stitchToken(text, "\n");    // "The cat sat on the mat.\n"
 *
 * // Or all at once:
 * const fullText = stitchTokens(tokens, context);
 * // "The cat sat on the mat.\n"
 *
 * // For wheel display:
 * formatTokenForDisplay(" mat")  // "mat"
 * formatTokenForDisplay("\n")    // "↵"
 */
```

### Frontend State Management

**Simple approach using React useState:**

```javascript
// app/page.js
'use client';

import { useState } from 'react';

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [generation, setGeneration] = useState(null);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [currentContext, setCurrentContext] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    setLoading(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await response.json();

      setGeneration(data);
      setCurrentPosition(0);
      setCurrentContext(prompt);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleTokenSelect(selectedToken) {
    const geminiToken = generation.tokens[currentPosition];

    if (selectedToken === geminiToken) {
      // Spin mode - just advance
      setCurrentPosition(prev => prev + 1);
      setCurrentContext(prev => prev + selectedToken);
    } else {
      // Manual selection - regenerate
      const newPrompt = currentContext + selectedToken;
      setPrompt(newPrompt);
      handleStart(); // Regenerate with new context
    }
  }

  const currentLogprobs = generation?.logprobsByPosition[currentPosition];

  return (
    <div>
      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Start typing..."
      />
      <button onClick={handleStart} disabled={loading}>
        {loading ? 'Generating...' : 'Start'}
      </button>

      {currentLogprobs && (
        <TokenWheel
          logprobs={currentLogprobs}
          onSelect={handleTokenSelect}
        />
      )}

      <div>Current text: {currentContext}</div>
    </div>
  );
}
```

---

## Vercel Deployment Configuration

### 1. Environment Variables

**Setup in Vercel Dashboard:**

1. Go to your project on [vercel.com](https://vercel.com)
2. Navigate to **Settings → Environment Variables**
3. Add the following variables:

| Key | Value | Target |
|-----|-------|--------|
| `GEMINI_API_KEY` | Your Gemini API key | Production, Preview, Development |

**Local Development:**

Create `.env.local` file (do NOT commit):

```env
GEMINI_API_KEY=AIzaSy...your-key-here
```

**Accessing in Code:**

```javascript
// In API routes or server components
const apiKey = process.env.GEMINI_API_KEY;
```

### 2. Serverless Function Constraints

**Default Limits (Hobby/Free Tier):**
- Execution time: 10 seconds
- Memory: 1024 MB
- Payload size: 4.5 MB request, 4.5 MB response

**Pro Tier:**
- Execution time: 60 seconds (configurable up to 300s)
- Memory: 3008 MB (configurable)

**Configuring Limits in Next.js:**

```javascript
// app/api/generate/route.js
export const maxDuration = 30; // 30 seconds (requires Pro tier)
export const runtime = 'nodejs'; // or 'edge'
```

**Edge Runtime vs. Node.js Runtime:**

| Feature | Edge Runtime | Node.js Runtime |
|---------|-------------|-----------------|
| Cold start | ~0ms (instant) | ~100-500ms |
| Execution time | 30s max | 60s max (Pro) |
| Available libraries | Limited (Web APIs only) | Full Node.js |
| Memory | 128 MB | 1024-3008 MB |
| Recommended for | Simple, fast APIs | Complex operations, SDKs |

**For Gemini API:** Use **Node.js runtime** (requires full SDK support).

### 3. Deployment Configuration

**File: `next.config.js`**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features if needed
  experimental: {
    serverActions: true
  },

  // Environment variables exposed to the browser (use sparingly)
  env: {
    // Only non-sensitive values here
  }
};

module.exports = nextConfig;
```

**File: `.env.example`** (template for developers)

```env
# Gemini API Configuration
GEMINI_API_KEY=your-api-key-here
```

### 4. Deployment Workflow

**Option 1: GitHub Integration (Recommended)**

1. Push code to GitHub repository
2. Connect repository to Vercel
3. Vercel auto-deploys on every push to `main`
4. Preview deployments for pull requests

**Option 2: Vercel CLI**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### 5. Cold Start Optimization

**Strategies to reduce cold starts:**

1. **Use Edge Runtime for simple routes:**
   ```javascript
   export const runtime = 'edge';
   ```

2. **Minimize dependencies:**
   - Only import what you need
   - Avoid large libraries in serverless functions

3. **Consider caching:**
   ```javascript
   // Cache model responses if possible
   export const revalidate = 3600; // 1 hour
   ```

---

## Implementation Roadmap

### Phase 1: Basic Gemini API Integration (Week 1)

**Goals:**
- Set up Next.js project
- Implement basic Gemini API call
- Test logprobs response structure
- Configure system instructions

**Tasks:**
1. Initialize Next.js project: `npx create-next-app@latest llm-token-wheel`
2. Install dependencies: `npm install @google/generative-ai`
3. Create `lib/gemini.js` with `generateWithLogprobs()` function
4. Create API route: `app/api/generate/route.js`
5. Test with Postman/curl to verify logprobs structure
6. Experiment with different system instructions for continuation

**Success Criteria:**
- API returns complete generation + logprobs
- Logprobs structure matches expected format
- System instructions enforce sentence continuation

### Phase 2: Next.js API Route & State Management (Week 2)

**Goals:**
- Implement complete API route with error handling
- Build frontend state management for token stepping
- Create basic UI (no wheel animation yet)

**Tasks:**
1. Complete `app/api/generate/route.js` with validation
2. Create `app/page.js` with state management
3. Implement token selection logic (spin vs. manual)
4. Build simple UI with buttons (no wheel yet)
5. Test full flow: generate → step → regenerate

**Success Criteria:**
- Users can input prompt and generate
- Users can step through tokens (Spin mode works)
- Regeneration triggers when user selects different token
- No errors in console

### Phase 3: Vercel Deployment & Environment Setup (Week 3)

**Goals:**
- Deploy to Vercel
- Configure environment variables
- Test production behavior

**Tasks:**
1. Create Vercel account and connect GitHub
2. Add `GEMINI_API_KEY` to Vercel environment variables
3. Create `.env.example` template
4. Deploy and test in production
5. Monitor function logs for errors
6. Optimize cold start performance

**Success Criteria:**
- Application deployed and accessible
- API key secure (not exposed to frontend)
- Functions execute within time limits
- No CORS or deployment errors

### Phase 4: Frontend Wheel Visualization (Week 4)

**Goals:**
- Build interactive probability wheel
- Implement spinning animation
- Add visual polish

**Tasks:**
1. Create `TokenWheel.jsx` component with SVG
2. Calculate wedge angles from probabilities
3. Implement spin animation (Framer Motion)
4. Add click handlers for manual selection
5. Style and polish UI

**CRITICAL: Rigged Wheel Logic**

In **Spin Mode**, the wheel animation must be **deterministic**, not random. The wheel must always land on the `chosenCandidate` token that Gemini already generated.

**Why this matters:**
- If you use random physics (friction, momentum), the wheel might land on a different wedge
- But Gemini already decided the next token - we're just revealing it dramatically
- The animation is purely theatrical - the outcome is predetermined

**Implementation approach:**

```javascript
/**
 * Calculate the exact rotation to land on the chosen token.
 * @param {Object[]} wedges - Array of {token, probability, startAngle, endAngle}
 * @param {string} chosenToken - The token Gemini generated
 * @param {number} currentRotation - Current wheel rotation in degrees
 * @returns {number} - Target rotation in degrees
 */
function calculateRiggedRotation(wedges, chosenToken, currentRotation = 0) {
  // Find the wedge for the chosen token
  const chosenWedge = wedges.find(w => w.token === chosenToken);
  if (!chosenWedge) {
    console.error('Chosen token not found in wedges!');
    return currentRotation;
  }

  // Calculate center of the chosen wedge
  const wedgeCenterAngle = (chosenWedge.startAngle + chosenWedge.endAngle) / 2;

  // The pointer is at the top (0 degrees or 360)
  // We need to rotate so the wedge center aligns with the pointer
  // Add multiple full rotations for dramatic spin effect
  const fullSpins = 3 + Math.floor(Math.random() * 3); // 3-5 full rotations
  const targetRotation = (360 * fullSpins) + (360 - wedgeCenterAngle);

  return currentRotation + targetRotation;
}

// In your animation (using Framer Motion):
// <motion.g
//   animate={{ rotate: targetRotation }}
//   transition={{
//     duration: 3,
//     ease: [0.25, 0.1, 0.25, 1], // Smooth deceleration
//   }}
// >
```

**Key points:**
- Calculate exact degrees to land pointer on chosen wedge center
- Add 3-5 full rotations for dramatic effect
- Use easing that decelerates naturally (like a real wheel slowing down)
- The randomness is in HOW MANY spins, not WHERE it lands

**Out of scope for backend research** - focus on API integration first.

---

## Code Examples

### Complete Minimal Working Example

**API Route: `app/api/generate/route.js`**

```javascript
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 30;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'No prompt provided' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp"
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 20,
        responseLogprobs: true,
        logprobs: 8
      },
      systemInstruction: "Continue the user's text naturally. Do NOT repeat the input. Do NOT use markdown. Output only continuation words."
    });

    const response = result.response;

    // CRITICAL: Check for safety blocks before accessing content
    if (response.promptFeedback?.blockReason) {
      return NextResponse.json({
        error: 'Safety block',
        reason: response.promptFeedback.blockReason,
        userMessage: 'Your prompt was flagged. Please try a different prompt.'
      }, { status: 400 });
    }

    if (!response.candidates || response.candidates.length === 0) {
      return NextResponse.json({ error: 'No content generated' }, { status: 500 });
    }

    const candidate = response.candidates[0];

    // Check if generation was stopped by safety filter
    if (candidate.finishReason === 'SAFETY') {
      return NextResponse.json({
        error: 'Safety block',
        userMessage: 'Generation stopped by safety filter. Please try a different prompt.'
      }, { status: 400 });
    }

    const logprobs = candidate.logprobsResult;

    if (!logprobs || !logprobs.chosenCandidates) {
      return NextResponse.json({ error: 'No logprobs returned' }, { status: 500 });
    }

    const tokens = logprobs.chosenCandidates.map(c => c.token);
    const probsByPosition = logprobs.topCandidates.map(pos => {
      const probs = {};
      pos.candidates.forEach(c => {
        probs[c.token] = Math.exp(c.logProbability);
      });
      const total = Object.values(probs).reduce((a, b) => a + b, 0);
      Object.keys(probs).forEach(k => probs[k] /= total);
      return probs;
    });

    return NextResponse.json({
      text: response.text(),
      tokens,
      logprobsByPosition: probsByPosition
    });

  } catch (error) {
    console.error('Gemini API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Test with curl:**

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "The cat sat on the"}'
```

**Expected Response:**

```json
{
  "text": " floor and started purring",
  "tokens": [" floor", " and", " started", " purring"],
  "logprobsByPosition": [
    {
      " floor": 0.076,
      " bed": 0.065,
      " chair": 0.042,
      " mat": 0.035,
      " couch": 0.028,
      " roof": 0.022,
      " lap": 0.019,
      " table": 0.015
    },
    {
      " and": 0.234,
      ",": 0.123,
      " then": 0.089,
      ".": 0.056,
      " while": 0.045,
      " before": 0.038,
      " as": 0.032,
      " to": 0.028
    },
    ...
  ]
}
```

---

## Critical Questions Answered

### 1. Does Gemini's logprobs include probabilities at EVERY token position?

**Answer: YES ✅**

Gemini returns `topCandidates` as an array where:
- Index 0 = token position 0 (first generated token)
- Index 1 = token position 1 (second generated token)
- Index N = token position N

Each position contains the top K candidates at that position.

### 2. How many tokens per generation should we request?

**Recommendation: 10-20 tokens**

Rationale:
- **Too few (< 5):** Not enough exploration, users finish too quickly
- **Just right (10-20):** Enough for interesting patterns, not overwhelming
- **Too many (> 30):** Slow API response, user fatigue

Adjust `maxOutputTokens` based on use case:
- Short phrases: 5-10 tokens
- Full sentences: 15-20 tokens
- Longer exploration: 20-30 tokens

### 3. What's the exact response structure for multi-token logprobs?

**Answer: See structure above**

Key points:
- `chosenCandidates`: Array of actually generated tokens
- `topCandidates`: Array of arrays (one per position)
- Each position has `candidates` array with `{token, logProbability}`
- Log probabilities must be exponentiated: `prob = e^(log_prob)`
- Probabilities should be normalized to sum to 1.0

### 4. Can we use the Google AI JavaScript SDK or do we need the REST API?

**Answer: Use the JavaScript SDK ✅**

The `@google/generative-ai` package is officially supported and works perfectly with Next.js API routes. No need for manual REST API calls.

### 5. What about rate limits?

**Gemini API Rate Limits (Free Tier):**
- 15 requests per minute
- 1 million tokens per minute
- 1,500 requests per day

**For educational use:** Free tier should be sufficient. Monitor usage in [Google AI Studio](https://makersuite.google.com/app/apikey).

---

## Best Practices

### Security

1. **Never expose API keys in frontend:**
   ```javascript
   // ❌ BAD
   const apiKey = "AIzaSy...";

   // ✅ GOOD
   const apiKey = process.env.GEMINI_API_KEY;
   ```

2. **Use environment variables:**
   - Store in Vercel dashboard (production)
   - Store in `.env.local` (development)
   - Never commit `.env.local` to git

3. **Validate user input:**
   ```javascript
   if (!prompt || prompt.length > 500) {
     return NextResponse.json({ error: 'Invalid prompt' }, { status: 400 });
   }
   ```

### Performance

1. **Optimize API calls:**
   - Only regenerate when necessary (user diverges)
   - Cache responses if possible (future enhancement)

2. **Set appropriate timeouts:**
   ```javascript
   export const maxDuration = 30; // 30 seconds
   ```

3. **Use Edge Runtime for simple routes:**
   - Not for Gemini API route (needs Node.js)
   - Consider for health checks, static endpoints

### Error Handling

```javascript
export async function POST(request) {
  try {
    const { prompt } = await request.json();
    // ... API call
  } catch (error) {
    console.error('Gemini API error:', error);

    // Return user-friendly error
    return NextResponse.json(
      {
        error: 'Failed to generate text. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
```

---

## Next Steps

1. **Set up Next.js project:**
   ```bash
   npx create-next-app@latest llm-token-wheel
   cd llm-token-wheel
   npm install @google/generative-ai
   ```

2. **Get Gemini API key:**
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create API key
   - Add to `.env.local`

3. **Implement API route:**
   - Follow code examples above
   - Test with curl/Postman

4. **Deploy to Vercel:**
   - Connect GitHub repository
   - Add environment variables
   - Deploy and test

5. **Build frontend:**
   - Implement state management
   - Create wheel visualization (Phase 4)

---

## Resources

- **Gemini API Documentation:** https://ai.google.dev/docs
- **Google Gen AI SDK:** https://github.com/googleapis/generative-ai-js
- **Next.js Documentation:** https://nextjs.org/docs
- **Vercel Documentation:** https://vercel.com/docs
- **Google AI Studio:** https://makersuite.google.com/

---

## Support

For issues or questions:
1. Check this guide first
2. Review official documentation links above
3. Test with minimal example code
4. Check Vercel function logs for errors

---

**Last Updated:** Based on research conducted 2026-01-13 using official documentation from:
- Google Cloud Platform Generative AI repository
- Next.js v15 documentation
- Vercel platform documentation
