/**
 * Tests for Gemini Pro Client
 */

import { GeminiProClient } from '../gemini-client';

global.fetch = jest.fn();

describe('GeminiProClient', () => {
  let client: GeminiProClient;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-api-key';
    client = new GeminiProClient();
    jest.clearAllMocks();
  });

  describe('generateContent', () => {
    it('should generate text content', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'Generated response' }],
                role: 'model',
              },
              finishReason: 'STOP',
            },
          ],
        }),
      });

      const result = await client.generateContent('Test prompt');

      expect(result).toBe('Generated response');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('gemini-pro:generateContent'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should handle API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad request',
      });

      await expect(client.generateContent('Test')).rejects.toThrow('Gemini API error');
    });

    it('should handle empty responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [],
        }),
      });

      await expect(client.generateContent('Test')).rejects.toThrow('No response');
    });
  });

  describe('generateJSON', () => {
    it('should parse JSON from response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: '{"key": "value"}' }],
                role: 'model',
              },
              finishReason: 'STOP',
            },
          ],
        }),
      });

      const result = await client.generateJSON('Generate JSON');

      expect(result).toEqual({ key: 'value' });
    });

    it('should extract JSON from markdown code blocks', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: '```json\n{"key": "value"}\n```' }],
                role: 'model',
              },
              finishReason: 'STOP',
            },
          ],
        }),
      });

      const result = await client.generateJSON('Generate JSON');

      expect(result).toEqual({ key: 'value' });
    });

    it('should throw on invalid JSON', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'Not valid JSON' }],
                role: 'model',
              },
              finishReason: 'STOP',
            },
          ],
        }),
      });

      await expect(client.generateJSON('Generate')).rejects.toThrow('Invalid JSON');
    });
  });

  describe('chat', () => {
    it('should handle conversation history', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'Response to conversation' }],
                role: 'model',
              },
              finishReason: 'STOP',
            },
          ],
        }),
      });

      const messages = [
        { role: 'user' as const, parts: [{ text: 'Hello' }] },
        { role: 'model' as const, parts: [{ text: 'Hi there' }] },
        { role: 'user' as const, parts: [{ text: 'How are you?' }] },
      ];

      const result = await client.chat(messages);

      expect(result).toBe('Response to conversation');
    });
  });
});
