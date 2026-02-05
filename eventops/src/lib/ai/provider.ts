/**
 * Unified AI Provider with automatic fallback
 *
 * Provider chain: Gemini → OpenAI → Error
 * Configurable via PREFERRED_AI_PROVIDER env var
 */
import { getGeminiClient } from './gemini-client';
import { generateWithOpenAI, isOpenAIAvailable, testOpenAIConnection } from './openai-client';
import { logger } from '@/lib/logger';

export type AIProvider = 'gemini' | 'openai';

export interface GenerateContentOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface GenerateContentResult {
  content: string;
  provider: AIProvider;
  fallbackUsed: boolean;
}

interface ProviderError {
  provider: AIProvider;
  error: string;
  isRateLimited: boolean;
  retryAfterSeconds?: number;
}

/**
 * Get preferred provider from env or default to gemini
 */
function getPreferredProvider(): AIProvider {
  const preferred = process.env.PREFERRED_AI_PROVIDER?.toLowerCase();
  if (preferred === 'openai') return 'openai';
  return 'gemini'; // default
}

/**
 * Check if an error is a rate limit error
 */
function isRateLimitError(error: unknown): { isRateLimit: boolean; retryAfterSeconds?: number } {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('429') || message.includes('quota') || message.includes('rate')) {
      // Try to extract retry time
      const match = message.match(/retry.*?(\d+)/i);
      const retryAfterSeconds = match ? parseInt(match[1], 10) : 60;
      return { isRateLimit: true, retryAfterSeconds };
    }
  }
  return { isRateLimit: false };
}

/**
 * Check if error is a model not found error
 */
function isModelNotFoundError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('404') || message.includes('not found') || message.includes('not supported')
    );
  }
  return false;
}

/**
 * Generate content with Gemini
 */
async function generateWithGeminiProvider(
  prompt: string,
  options: GenerateContentOptions
): Promise<string> {
  const gemini = getGeminiClient();
  return gemini.generateContent(prompt, {
    temperature: options.temperature ?? 0.7,
    maxOutputTokens: options.maxTokens ?? 500,
  });
}

/**
 * Generate content with OpenAI
 */
async function generateWithOpenAIProvider(
  prompt: string,
  options: GenerateContentOptions
): Promise<string> {
  return generateWithOpenAI(prompt, {
    temperature: options.temperature ?? 0.7,
    maxTokens: options.maxTokens ?? 500,
  });
}

/**
 * Generate content with automatic provider fallback
 *
 * @param prompt - The prompt to send to the AI
 * @param options - Generation options
 * @returns Content and metadata about which provider was used
 */
export async function generateContent(
  prompt: string,
  options: GenerateContentOptions = {}
): Promise<GenerateContentResult> {
  const preferred = getPreferredProvider();
  const errors: ProviderError[] = [];

  // Try preferred provider first
  const providers: AIProvider[] =
    preferred === 'gemini' ? ['gemini', 'openai'] : ['openai', 'gemini'];

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    const isFirstAttempt = i === 0;

    try {
      let content: string;

      if (provider === 'gemini') {
        content = await generateWithGeminiProvider(prompt, options);
      } else {
        if (!isOpenAIAvailable()) {
          errors.push({
            provider: 'openai',
            error: 'OPENAI_API_KEY not configured',
            isRateLimited: false,
          });
          continue;
        }
        content = await generateWithOpenAIProvider(prompt, options);
      }

      if (!isFirstAttempt) {
        logger.info('AI provider fallback used', {
          preferredProvider: preferred,
          actualProvider: provider,
          previousErrors: errors.map((e) => ({ provider: e.provider, error: e.error })),
        });
      }

      return {
        content,
        provider,
        fallbackUsed: !isFirstAttempt,
      };
    } catch (error) {
      const { isRateLimit, retryAfterSeconds } = isRateLimitError(error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      errors.push({
        provider,
        error: errorMessage,
        isRateLimited: isRateLimit,
        retryAfterSeconds,
      });

      logger.warn('AI provider failed', {
        provider,
        error: errorMessage,
        isRateLimit,
        retryAfterSeconds,
        willFallback: i < providers.length - 1,
      });

      // If it's a model not found error for Gemini, try the next provider
      if (provider === 'gemini' && isModelNotFoundError(error)) {
        continue;
      }

      // If rate limited and there's a fallback, continue
      if (isRateLimit && i < providers.length - 1) {
        continue;
      }

      // For other errors, also try fallback
      if (i < providers.length - 1) {
        continue;
      }
    }
  }

  // All providers failed
  const rateLimitedError = errors.find((e) => e.isRateLimited);
  if (rateLimitedError) {
    const err = new Error(
      `All AI providers rate limited. Retry after ${rateLimitedError.retryAfterSeconds}s`
    );
    (err as any).retryAfterSeconds = rateLimitedError.retryAfterSeconds;
    (err as any).isRateLimited = true;
    throw err;
  }

  throw new Error(
    `All AI providers failed: ${errors.map((e) => `${e.provider}: ${e.error}`).join('; ')}`
  );
}

/**
 * Check health of all AI providers
 */
export async function checkAIHealth(): Promise<{
  gemini: { status: 'ok' | 'error' | 'not_configured'; error?: string };
  openai: { status: 'ok' | 'error' | 'not_configured'; error?: string };
  preferredProvider: AIProvider;
}> {
  const preferredProvider = getPreferredProvider();

  // Check Gemini
  let geminiStatus: { status: 'ok' | 'error' | 'not_configured'; error?: string };
  if (!process.env.GEMINI_API_KEY) {
    geminiStatus = { status: 'not_configured' };
  } else {
    try {
      const gemini = getGeminiClient();
      // Try a simple generation to verify API works
      await gemini.generateContent('Say "ok"', { maxOutputTokens: 10 });
      geminiStatus = { status: 'ok' };
    } catch (error) {
      const { isRateLimit, retryAfterSeconds } = isRateLimitError(error);
      geminiStatus = {
        status: 'error',
        error: isRateLimit
          ? `Rate limited, retry in ${retryAfterSeconds}s`
          : error instanceof Error
            ? error.message
            : 'Unknown error',
      };
    }
  }

  // Check OpenAI
  const openaiResult = await testOpenAIConnection();
  const openaiStatus =
    openaiResult.status === 'ok'
      ? { status: 'ok' as const }
      : process.env.OPENAI_API_KEY
        ? { status: 'error' as const, error: openaiResult.error }
        : { status: 'not_configured' as const };

  return {
    gemini: geminiStatus,
    openai: openaiStatus,
    preferredProvider,
  };
}
