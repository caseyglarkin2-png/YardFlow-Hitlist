import { prisma } from './db';
import { generateCompanyResearch } from './ai-research';

interface QueueItem {
  accountId: string;
  accountName: string;
  priority: number;
}

interface QueueResult {
  accountId: string;
  accountName: string;
  status: 'completed' | 'error' | 'skipped' | 'not_found';
  error?: string;
  daysSinceUpdate?: number;
}

class ResearchQueue {
  private queue: QueueItem[] = [];
  private processing = false;
  private results: Map<string, QueueResult> = new Map();
  private currentItem: QueueItem | null = null;

  async addBatch(accountIds: string[], forceRefresh = false) {
    const accounts = await prisma.targetAccount.findMany({
      where: { id: { in: accountIds } },
      select: { id: true, name: true, icpScore: true },
    });

    accounts.forEach(account => {
      this.queue.push({
        accountId: account.id,
        accountName: account.name,
        priority: account.icpScore || 0,
      });
    });

    // Sort by priority (highest ICP score first)
    this.queue.sort((a, b) => b.priority - a.priority);

    if (!this.processing) {
      this.processQueue(forceRefresh);
    }

    return { queued: accounts.length };
  }

  private async processQueue(forceRefresh = false) {
    if (this.queue.length === 0) {
      this.processing = false;
      this.currentItem = null;
      return;
    }

    this.processing = true;
    const item = this.queue.shift()!;
    this.currentItem = item;

    try {
      const account = await prisma.targetAccount.findUnique({
        where: { id: item.accountId },
        include: { dossier: true },
      });

      if (!account) {
        this.results.set(item.accountId, {
          accountId: item.accountId,
          accountName: item.accountName,
          status: 'not_found',
        });
        this.processQueue(forceRefresh);
        return;
      }

      // Check if recent dossier exists
      const daysSince = account.dossier
        ? Math.floor((Date.now() - account.dossier.researchedAt.getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      if (!forceRefresh && daysSince < 7) {
        this.results.set(item.accountId, {
          accountId: item.accountId,
          accountName: item.accountName,
          status: 'skipped',
          error: 'Recent dossier exists',
          daysSinceUpdate: daysSince,
        });
        this.processQueue(forceRefresh);
        return;
      }

      // Generate research
      const research = await generateCompanyResearch(account.name, account.website || undefined);

      // Save dossier
      await prisma.companyDossier.upsert({
        where: { accountId: item.accountId },
        create: {
          accountId: item.accountId,
          companyOverview: research.companyOverview || null,
          recentNews: research.recentNews || null,
          industryContext: research.industryContext || null,
          keyPainPoints: research.keyPainPoints || null,
          companySize: research.companySize || null,
          facilityCount: research.facilityCount || null,
          locations: research.locations || null,
          operationalScale: research.operationalScale || null,
          rawData: JSON.stringify(research),
          researchedAt: new Date(),
          researchedBy: 'bulk-system',
        },
        update: {
          companyOverview: research.companyOverview || null,
          recentNews: research.recentNews || null,
          industryContext: research.industryContext || null,
          keyPainPoints: research.keyPainPoints || null,
          companySize: research.companySize || null,
          facilityCount: research.facilityCount || null,
          locations: research.locations || null,
          operationalScale: research.operationalScale || null,
          rawData: JSON.stringify(research),
          researchedAt: new Date(),
          researchedBy: 'bulk-system',
        },
      });

      this.results.set(item.accountId, {
        accountId: item.accountId,
        accountName: item.accountName,
        status: 'completed',
        daysSinceUpdate: daysSince,
      });

      // Rate limit: 1 per second to avoid OpenAI rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      this.results.set(item.accountId, {
        accountId: item.accountId,
        accountName: item.accountName,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      // Process next item
      this.processQueue(forceRefresh);
    }
  }

  getStatus() {
    const completed = Array.from(this.results.values());
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      currentItem: this.currentItem,
      totalProcessed: completed.length,
      completedCount: completed.filter(r => r.status === 'completed').length,
      errorCount: completed.filter(r => r.status === 'error').length,
      skippedCount: completed.filter(r => r.status === 'skipped').length,
      results: completed,
    };
  }

  clearResults() {
    this.results.clear();
  }
}

// Singleton instance
export const researchQueue = new ResearchQueue();
