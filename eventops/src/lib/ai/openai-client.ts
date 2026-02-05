/**
 * OpenAI Client for content generation
 * Fallback provider when Gemini is unavailable
 */
import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

function getClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

export interface OpenAIGenerateOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

/**
 * Generate content using OpenAI
 */
export async function generateWithOpenAI(
  prompt: string,
  options: OpenAIGenerateOptions = {}
): Promise<string> {
  const { temperature = 0.7, maxTokens = 500, model = 'gpt-4o-mini' } = options;

  const client = getClient();

  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content:
          'You are a helpful assistant that generates professional email content. Always respond with valid JSON containing "subject" and "content" fields.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  return content;
}

/**
 * Check if OpenAI is available (has API key configured)
 */
export function isOpenAIAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Test OpenAI connectivity
 */
export async function testOpenAIConnection(): Promise<{ status: 'ok' | 'error'; error?: string }> {
  if (!process.env.OPENAI_API_KEY) {
    return { status: 'error', error: 'OPENAI_API_KEY not configured' };
  }

  try {
    const client = getClient();
    // Simple models list call to test connectivity
    await client.models.list();
    return { status: 'ok' };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
