/**
 * Tests for AI Provider with Fallback
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the provider module
vi.mock('@/lib/ai/gemini-client', () => ({
  getGeminiClient: vi.fn(),
}));

vi.mock('@/lib/ai/openai-client', () => ({
  generateWithOpenAI: vi.fn(),
  isOpenAIAvailable: vi.fn(),
  testOpenAIConnection: vi.fn(),
}));

import { generateContent, checkAIHealth } from '@/lib/ai/provider';
import { getGeminiClient } from '@/lib/ai/gemini-client';
import { generateWithOpenAI, isOpenAIAvailable } from '@/lib/ai/openai-client';

describe('AI Provider Fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses Gemini when available', async () => {
    const mockGemini = {
      generateContent: vi.fn().mockResolvedValue('{"subject":"Test","content":"Hello"}'),
    };
    vi.mocked(getGeminiClient).mockReturnValue(mockGemini as any);

    const result = await generateContent('test prompt');

    expect(result.provider).toBe('gemini');
    expect(result.fallbackUsed).toBe(false);
    expect(mockGemini.generateContent).toHaveBeenCalled();
  });

  it('falls back to OpenAI when Gemini fails with rate limit', async () => {
    const mockGemini = {
      generateContent: vi.fn().mockRejectedValue(new Error('429 quota exceeded')),
    };
    vi.mocked(getGeminiClient).mockReturnValue(mockGemini as any);
    vi.mocked(isOpenAIAvailable).mockReturnValue(true);
    vi.mocked(generateWithOpenAI).mockResolvedValue(
      '{"subject":"Test","content":"Hello from OpenAI"}'
    );

    const result = await generateContent('test prompt');

    expect(result.provider).toBe('openai');
    expect(result.fallbackUsed).toBe(true);
    expect(generateWithOpenAI).toHaveBeenCalled();
  });

  it('falls back to OpenAI when Gemini model not found', async () => {
    const mockGemini = {
      generateContent: vi.fn().mockRejectedValue(new Error('404 model not found')),
    };
    vi.mocked(getGeminiClient).mockReturnValue(mockGemini as any);
    vi.mocked(isOpenAIAvailable).mockReturnValue(true);
    vi.mocked(generateWithOpenAI).mockResolvedValue('{"subject":"Test","content":"Hello"}');

    const result = await generateContent('test prompt');

    expect(result.provider).toBe('openai');
    expect(result.fallbackUsed).toBe(true);
  });

  it('throws rate limit error when both providers rate limited', async () => {
    const mockGemini = {
      generateContent: vi.fn().mockRejectedValue(new Error('429 quota exceeded retry in 60s')),
    };
    vi.mocked(getGeminiClient).mockReturnValue(mockGemini as any);
    vi.mocked(isOpenAIAvailable).mockReturnValue(true);
    vi.mocked(generateWithOpenAI).mockRejectedValue(new Error('429 rate limit exceeded'));

    await expect(generateContent('test prompt')).rejects.toThrow('rate limited');
  });

  it('skips OpenAI fallback when not configured', async () => {
    const mockGemini = {
      generateContent: vi.fn().mockRejectedValue(new Error('Gemini error')),
    };
    vi.mocked(getGeminiClient).mockReturnValue(mockGemini as any);
    vi.mocked(isOpenAIAvailable).mockReturnValue(false);

    await expect(generateContent('test prompt')).rejects.toThrow('All AI providers failed');
  });
});
