/**
 * Gemini Pro Client
 * Google's Gemini Pro AI model integration
 */

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason: string;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export class GeminiProClient {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  private model = 'gemini-pro';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
  }

  /**
   * Generate content using Gemini Pro
   */
  async generateContent(
    prompt: string,
    options: {
      temperature?: number;
      maxOutputTokens?: number;
      topP?: number;
      topK?: number;
    } = {}
  ): Promise<string> {
    const {
      temperature = 0.7,
      maxOutputTokens = 2048,
      topP = 0.95,
      topK = 40,
    } = options;

    try {
      const response = await fetch(
        `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature,
              maxOutputTokens,
              topP,
              topK,
            },
            safetySettings: [
              {
                category: 'HARM_CATEGORY_HARASSMENT',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE',
              },
              {
                category: 'HARM_CATEGORY_HATE_SPEECH',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE',
              },
              {
                category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE',
              },
              {
                category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE',
              },
            ],
          }),
          signal: AbortSignal.timeout(30000),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${error}`);
      }

      const data: GeminiResponse = await response.json();

      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No response from Gemini');
      }

      const text = data.candidates[0].content.parts[0].text;
      return text.trim();
    } catch (error: any) {
      console.error('Gemini Pro error:', error);
      throw error;
    }
  }

  /**
   * Generate content with conversation history
   */
  async chat(
    messages: GeminiMessage[],
    options: {
      temperature?: number;
      maxOutputTokens?: number;
    } = {}
  ): Promise<string> {
    const {
      temperature = 0.7,
      maxOutputTokens = 2048,
    } = options;

    try {
      const response = await fetch(
        `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: messages,
            generationConfig: {
              temperature,
              maxOutputTokens,
            },
          }),
          signal: AbortSignal.timeout(30000),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${error}`);
      }

      const data: GeminiResponse = await response.json();
      return data.candidates[0].content.parts[0].text.trim();
    } catch (error: any) {
      console.error('Gemini chat error:', error);
      throw error;
    }
  }

  /**
   * Generate structured JSON output
   */
  async generateJSON<T = any>(
    prompt: string,
    schema?: string
  ): Promise<T> {
    const systemPrompt = schema
      ? `${prompt}\n\nRespond ONLY with valid JSON matching this schema:\n${schema}`
      : `${prompt}\n\nRespond ONLY with valid JSON.`;

    const text = await this.generateContent(systemPrompt, {
      temperature: 0.3, // Lower temp for structured output
    });

    // Extract JSON from response (handles markdown code blocks)
    const jsonMatch = text.match(/```json[\n\r]?([\s\S]*?)[\n\r]?```/) || text.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;

    try {
      return JSON.parse(jsonText.trim());
    } catch (error) {
      console.error('Failed to parse Gemini JSON response:', text);
      throw new Error('Invalid JSON response from Gemini');
    }
  }
}
