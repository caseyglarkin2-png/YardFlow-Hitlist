import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db as prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ai/sentiment - Analyze sentiment of text (email, note, etc.)
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { text } = await req.json();

  if (!text || text.trim().length === 0) {
    return NextResponse.json({ error: 'Text required' }, { status: 400 });
  }

  try {
    // Basic sentiment analysis using keyword matching
    // In production, use OpenAI API or sentiment analysis library
    
    const lowerText = text.toLowerCase();
    
    const positiveWords = [
      'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'perfect',
      'happy', 'excited', 'interested', 'yes', 'definitely', 'absolutely',
      'thank', 'appreciate', 'looking forward', 'sounds good', 'works for me',
    ];
    
    const negativeWords = [
      'bad', 'terrible', 'awful', 'hate', 'worst', 'poor', 'disappointing',
      'unfortunately', 'cannot', 'unable', 'not interested', 'no thanks',
      'decline', 'reject', 'spam', 'unsubscribe', 'stop', 'never',
    ];
    
    const urgentWords = [
      'urgent', 'asap', 'immediately', 'critical', 'important', 'priority',
      'deadline', 'emergency', 'now', 'today', 'right away',
    ];

    let positiveCount = 0;
    let negativeCount = 0;
    let urgentCount = 0;

    positiveWords.forEach(word => {
      if (lowerText.includes(word)) positiveCount++;
    });

    negativeWords.forEach(word => {
      if (lowerText.includes(word)) negativeCount++;
    });

    urgentWords.forEach(word => {
      if (lowerText.includes(word)) urgentCount++;
    });

    // Calculate sentiment score (-1 to 1)
    const totalWords = positiveCount + negativeCount;
    let score = 0;
    
    if (totalWords > 0) {
      score = (positiveCount - negativeCount) / totalWords;
    }

    // Determine sentiment label
    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (score > 0.2) sentiment = 'positive';
    else if (score < -0.2) sentiment = 'negative';

    // Determine intent
    let intent: string[] = [];
    if (lowerText.includes('meeting') || lowerText.includes('schedule') || lowerText.includes('call')) {
      intent.push('schedule_meeting');
    }
    if (lowerText.includes('information') || lowerText.includes('details') || lowerText.includes('learn more')) {
      intent.push('request_info');
    }
    if (lowerText.includes('not interested') || lowerText.includes('no thank')) {
      intent.push('decline');
    }
    if (urgentCount > 0) {
      intent.push('urgent');
    }

    const response = {
      sentiment,
      score: Math.round(score * 100) / 100,
      confidence: Math.min(totalWords / 5, 1), // Max confidence at 5 keywords
      isUrgent: urgentCount > 0,
      intent,
      keywords: {
        positive: positiveCount,
        negative: negativeCount,
        urgent: urgentCount,
      },
    };

    /*
    // Production: Use OpenAI for sentiment analysis
    
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Analyze the sentiment and intent of this message. Return JSON with: sentiment (positive/negative/neutral), score (-1 to 1), isUrgent (bool), and intent (array).',
        },
        { role: 'user', content: text },
      ],
      temperature: 0.3,
    });
    
    const aiResponse = JSON.parse(completion.choices[0].message.content);
    */

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Sentiment analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Analysis failed' },
      { status: 500 }
    );
  }
}
