/**
 * A/B Testing Engine - Sprint 34.2
 * Subject line and template variant testing
 */

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export interface ABTestVariant {
  id: string;
  name: string;
  subject?: string;
  template?: string;
  weight: number; // 0-100, must sum to 100 across variants
}

export interface ABTest {
  id: string;
  name: string;
  testType: 'SUBJECT' | 'TEMPLATE' | 'TIMING' | 'FULL';
  variants: ABTestVariant[];
  startDate: Date;
  endDate?: Date;
  status: 'DRAFT' | 'RUNNING' | 'COMPLETED';
  winnerVariantId?: string;
}

class ABTestingEngine {
  /**
   * Select variant for new enrollment based on weight distribution
   */
  selectVariant(test: ABTest): ABTestVariant {
    const random = Math.random() * 100;
    let cumulative = 0;

    for (const variant of test.variants) {
      cumulative += variant.weight;
      if (random <= cumulative) {
        return variant;
      }
    }

    // Fallback to first variant
    return test.variants[0];
  }

  /**
   * Analyze test results and determine winner
   */
  async analyzeTest(testId: string): Promise<{
    winner: ABTestVariant | null;
    confidence: number;
    results: Record<
      string,
      {
        sent: number;
        opened: number;
        clicked: number;
        replied: number;
        openRate: number;
        clickRate: number;
        replyRate: number;
      }
    >;
  }> {
    const test = await prisma.ab_tests.findUnique({
      where: { id: testId },
      include: {
        ab_test_results: {
          include: {
            sequence_steps: {
              include: {
                email_engagement: true,
              },
            },
          },
        },
      },
    });

    if (!test) throw new Error('Test not found');

    const variants = JSON.parse(test.variants as string) as ABTestVariant[];
    const results: Record<string, any> = {};

    // Calculate metrics for each variant
    for (const variant of variants) {
      const variantResults = test.ab_test_results.filter((r) => r.variant_id === variant.id);

      const sent = variantResults.length;
      let opened = 0;
      let clicked = 0;
      let replied = 0;

      for (const result of variantResults) {
        const engagements = result.sequence_steps?.email_engagement || [];
        if (engagements.some((e) => e.event_type === 'OPEN')) opened++;
        if (engagements.some((e) => e.event_type === 'CLICK')) clicked++;
        if (result.sequence_steps?.replied_at) replied++;
      }

      results[variant.id] = {
        sent,
        opened,
        clicked,
        replied,
        openRate: sent > 0 ? (opened / sent) * 100 : 0,
        clickRate: sent > 0 ? (clicked / sent) * 100 : 0,
        replyRate: sent > 0 ? (replied / sent) * 100 : 0,
      };
    }

    // Determine winner based on reply rate (primary metric)
    let winner: ABTestVariant | null = null;
    let maxReplyRate = 0;

    for (const variant of variants) {
      const replyRate = results[variant.id].replyRate;
      if (replyRate > maxReplyRate) {
        maxReplyRate = replyRate;
        winner = variant;
      }
    }

    // Calculate confidence using chi-square test (simplified)
    // In production, use proper statistical library
    const minSampleSize = 30;
    const totalSent = Object.values(results).reduce((sum: number, r: any) => sum + r.sent, 0);
    const confidence =
      totalSent >= minSampleSize * variants.length
        ? Math.min(95, (totalSent / (minSampleSize * variants.length)) * 95)
        : 0;

    return { winner, confidence, results };
  }

  /**
   * Create new A/B test
   */
  async createTest(params: {
    name: string;
    testType: ABTest['testType'];
    variants: ABTestVariant[];
    sequenceId?: string;
  }): Promise<string> {
    // Validate weights sum to 100
    const totalWeight = params.variants.reduce((sum, v) => sum + v.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new Error('Variant weights must sum to 100');
    }

    const test = await prisma.ab_tests.create({
      data: {
        name: params.name,
        test_type: params.testType,
        variants: JSON.stringify(params.variants),
        status: 'DRAFT',
      },
    });

    logger.info('A/B test created', {
      testId: test.id,
      name: params.name,
      variants: params.variants.length,
    });

    return test.id;
  }

  /**
   * Record test enrollment
   */
  async recordEnrollment(params: {
    testId: string;
    variantId: string;
    sequenceStepId: string;
    contactId: string;
  }): Promise<void> {
    await prisma.ab_test_results.create({
      data: {
        test_id: params.testId,
        variant_id: params.variantId,
        sequence_step_id: params.sequenceStepId,
        contact_id: params.contactId,
      },
    });
  }
}

export const abTestingEngine = new ABTestingEngine();
