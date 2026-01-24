import { geminiClient } from '@/lib/ai/gemini-client';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/db';

export interface StrategicQuestion {
  question: string;
  category: 'pain_point' | 'operational' | 'growth' | 'competitive';
  timeEstimate: string; // "15-30 seconds", "2-3 minutes"
  followUps: string[];
}

export interface QuestionGenerationResult {
  accountId: string;
  companyName: string;
  questions: StrategicQuestion[];
  generatedAt: string;
  source: string; // "company_dossier", "basic_data"
}

/**
 * Generates strategic questions for booth conversations at Manifest 2026.
 *
 * Questions are designed to:
 * - Be open-ended (not yes/no)
 * - Reference specific company context
 * - Focus on YardFlow value props
 * - Take 15-30 seconds to answer
 * - Lead naturally to product demo conversation
 *
 * @param accountId - Target account ID
 * @returns 5-7 strategic questions with follow-ups
 */
export async function generateStrategicQuestions(
  accountId: string
): Promise<QuestionGenerationResult> {
  logger.info('Generating strategic questions', { accountId });

  // Fetch account with dossier and contacts
  const account = await prisma.target_accounts.findUnique({
    where: { id: accountId },
    include: {
      company_dossiers: true,
      people: {
        take: 5,
        orderBy: { createdAt: 'asc' }, // Get first contacts added
      },
    },
  });

  if (!account) {
    throw new Error(`Account not found: ${accountId}`);
  }

  // Build context from dossier or basic data
  const context = buildQuestionContext(account);

  // Generate questions via AI
  const questions = await generateQuestionsWithAI(account.name, context);

  // Note: Strategic questions are generated on-demand, not stored in database
  // This allows fresh questions based on latest account data

  logger.info('Strategic questions generated', {
    accountId,
    questionCount: questions.length,
  });

  return {
    accountId,
    companyName: account.name,
    questions,
    generatedAt: new Date().toISOString(),
    source: account.company_dossiers ? 'company_dossier' : 'basic_data',
  };
}

/**
 * Builds question generation context from account data.
 */
function buildQuestionContext(account: {
  name: string;
  industry?: string;
  website?: string;
  notes?: string;
  people?: Array<{ name: string; title?: string }>;
}): string {
  const parts: string[] = [];

  // Company basics
  parts.push(`Company: ${account.name}`);
  if (account.industry) parts.push(`Industry: ${account.industry}`);
  if (account.headquarters_city && account.headquarters_state) {
    parts.push(`HQ: ${account.headquarters_city}, ${account.headquarters_state}`);
  }

  // Dossier data (if available)
  const dossier = account.company_dossiers;
  if (dossier) {
    if (dossier.keyFindings) {
      parts.push(`\nKey Findings:\n${dossier.keyFindings}`);
    }
    if (dossier.businessChallenges) {
      parts.push(`\nChallenges:\n${dossier.businessChallenges}`);
    }
    if (dossier.operationalScale) {
      parts.push(`\nScale: ${dossier.operationalScale}`);
    }
    if (dossier.facilityCount) {
      parts.push(`\nFacilities: ${dossier.facilityCount}`);
    }
  } else {
    // Fall back to basic data
    if (account.notes) {
      parts.push(`\nNotes: ${account.notes}`);
    }
  }

  // Key contacts
  if (account.people && account.people.length > 0) {
    const contacts = account.people.map((p) => `${p.name} (${p.title || 'N/A'})`).join(', ');
    parts.push(`\nKey Contacts: ${contacts}`);
  }

  return parts.join('\n');
}

/**
 * Generates questions using AI with specific prompt engineering.
 */
async function generateQuestionsWithAI(
  companyName: string,
  context: string
): Promise<StrategicQuestion[]> {
  const prompt = `
You are a sales strategist preparing questions for a booth conversation at Manifest 2026, a supply chain & logistics conference.

Company Context:
${context}

YardFlow Value Props:
- Yard Network System for dock/trailer visibility
- Reduces driver wait times by 15-20%
- Cuts yard congestion and operational delays
- Real-time asset tracking across facilities
- Integration with WMS/TMS systems

Generate 5-7 strategic questions for booth conversations with ${companyName} executives.

Requirements for each question:
1. Open-ended (not yes/no)
2. Reference specific company context when possible
3. Focus on operational pain points YardFlow solves
4. Designed for 15-30 second answers
5. Lead naturally to discussing YardFlow solutions
6. Professional, consultative tone

Format your response as JSON array:
[
  {
    "question": "The actual question",
    "category": "pain_point" | "operational" | "growth" | "competitive",
    "timeEstimate": "15-30 seconds",
    "followUps": ["Follow-up question 1", "Follow-up 2"]
  }
]

Output ONLY valid JSON, no additional text or markdown formatting.
`;

  try {
    const response = await geminiClient.generateContent(prompt);
    const text = response.trim(); // geminiClient returns string directly

    // Remove markdown code blocks if present
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    const questions = JSON.parse(cleanText) as StrategicQuestion[];

    // Validate structure
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Invalid question format from AI');
    }

    logger.info('AI generated strategic questions', {
      count: questions.length,
      companyName,
    });

    return questions;
  } catch (error) {
    logger.error('Failed to generate questions with AI', {
      error,
      companyName,
    });

    // Return fallback questions
    return getFallbackQuestions(companyName, context);
  }
}

/**
 * Fallback questions if AI generation fails.
 */
function getFallbackQuestions(companyName: string, context: string): StrategicQuestion[] {
  const hasFacilities = context.includes('Facilities:');
  const hasDistribution =
    context.toLowerCase().includes('distribution') || context.toLowerCase().includes('logistics');

  const questions: StrategicQuestion[] = [
    {
      question: `How does ${companyName} currently manage yard operations across your facilities?`,
      category: 'operational',
      timeEstimate: '15-30 seconds',
      followUps: [
        'What percentage of delays are yard-related vs. dock-related?',
        'How do you track trailers waiting in the yard?',
      ],
    },
    {
      question: `What are your biggest pain points with driver wait times and yard congestion?`,
      category: 'pain_point',
      timeEstimate: '30-60 seconds',
      followUps: [
        'How much does this impact carrier relationships?',
        'Have you quantified the cost of yard delays?',
      ],
    },
    {
      question: `As ${companyName} scales operations, how are you planning to improve yard visibility?`,
      category: 'growth',
      timeEstimate: '30-60 seconds',
      followUps: [
        'What systems are you using for yard management today?',
        'How integrated are your WMS and yard operations?',
      ],
    },
  ];

  if (hasFacilities) {
    questions.push({
      question: `With multiple facilities, how do you maintain consistent yard processes across locations?`,
      category: 'operational',
      timeEstimate: '30-60 seconds',
      followUps: [
        'Do you have standardized yard procedures?',
        'How do you share best practices between sites?',
      ],
    });
  }

  if (hasDistribution) {
    questions.push({
      question: `How does yard efficiency impact your overall distribution network performance?`,
      category: 'competitive',
      timeEstimate: '15-30 seconds',
      followUps: [
        'What metrics do you track for yard operations?',
        'How does this affect your same-day/next-day delivery commitments?',
      ],
    });
  }

  return questions.slice(0, 5); // Return 3-5 questions
}
