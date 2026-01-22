import { NextResponse } from 'next/server';
import { generateWithLogprobs, SafetyBlockError } from '@/lib/gemini';

// Set maximum execution time (seconds)
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    // Parse JSON body
    const {
      prompt,
      systemInstruction,
      maxTokens,
      temperature,
      topP,
      topK,
      numLogprobs,
    } = await request.json();

    // Validate input
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required and must be a string' },
        { status: 400 }
      );
    }

    // Basic prompt length validation
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
      maxTokens: maxTokens || 20,
      temperature: temperature !== undefined ? temperature : undefined,
      topP: topP !== undefined ? topP : undefined,
      topK: topK !== undefined ? topK : undefined,
      numLogprobs: numLogprobs !== undefined ? numLogprobs : undefined,
    });

    // Return generation + logprobs
    return NextResponse.json({
      success: true,
      generatedText: result.text,
      tokens: result.tokens,
      logprobsByPosition: result.logprobsByPosition,
    });
  } catch (error) {
    console.error('Generation error:', error);

    // Handle safety blocks with user-friendly message
    if (error instanceof SafetyBlockError) {
      return NextResponse.json(
        {
          error: 'Content blocked by safety filter',
          reason: error.reason,
          userMessage:
            'Your prompt was flagged by the safety filter. Please try a different prompt.',
        },
        { status: 400 }
      );
    }

    // Generic error handling
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to generate text',
        details:
          process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
