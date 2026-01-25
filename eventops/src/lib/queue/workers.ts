import { Worker, Job } from 'bullmq';
import { getRedisConnection } from './client';
import { logger } from '@/lib/logger';
import { processEmailPattern } from './jobs/email-pattern';
import { processLinkedInEnrichment } from './jobs/linkedin-enrichment';
import { processGenerateEmails } from './jobs/generate-emails';
import { processSequenceStepJob } from './jobs/sequence-step';
import { AgentOrchestrator } from '@/lib/agents/orchestrator';
import { ProspectingAgent } from '@/lib/agents/prospecting-agent';
import { ResearchAgent } from '@/lib/agents/research-agent';
import { ContentPurposingAgent } from '@/lib/agents/content-purposing-agent';
import { GraphicsAgent } from '@/lib/agents/graphics-agent';
import { SocialsAgent } from '@/lib/agents/socials-agent';
import { ContractingAgent } from '@/lib/agents/contracting-agent';
import * as http from 'http';
import type {
  EmailPatternJobData,
  LinkedInEnrichmentJobData,
  GenerateEmailsJobData,
  SequenceStepJobData,
  AgentJobData,
} from './queues';

// Lazy worker initialization - prevents crashes if Redis unavailable at startup
let enrichmentWorker: Worker | null = null;
let sequenceWorker: Worker | null = null;
let agentWorker: Worker | null = null;

function getWorkerOptions() {
  return {
    connection: getRedisConnection(),
    concurrency: 5, // Process 5 jobs simultaneously
    limiter: {
      max: 10, // 10 jobs
      duration: 1000, // per second
    },
  };
}

function getEnrichmentWorker(): Worker {
  if (!enrichmentWorker) {
    enrichmentWorker = new Worker(
      'enrichment',
      async (job: Job) => {
        logger.info('Processing enrichment job', {
          jobId: job.id,
          name: job.name,
          data: job.data,
        });

        switch (job.name) {
          case 'email-pattern':
            return await processEmailPattern(job.data as EmailPatternJobData);

          case 'linkedin-enrichment':
            return await processLinkedInEnrichment(job.data as LinkedInEnrichmentJobData);

          case 'generate-emails':
            return await processGenerateEmails(job.data as GenerateEmailsJobData);

          default:
            throw new Error(`Unknown enrichment job type: ${job.name}`);
        }
      },
      getWorkerOptions()
    );

    // Event handlers
    enrichmentWorker.on('completed', (job) => {
      logger.info('Enrichment job completed', {
        jobId: job.id,
        name: job.name,
      });
    });

    enrichmentWorker.on('failed', (job, err) => {
      logger.error('Enrichment job failed', {
        jobId: job?.id,
        name: job?.name,
        error: err,
      });
    });

    enrichmentWorker.on('error', (err) => {
      logger.error('Enrichment worker error', { error: err });
    });
  }
  return enrichmentWorker;
}

function getSequenceWorker(): Worker {
  if (!sequenceWorker) {
    sequenceWorker = new Worker(
      'sequence-steps',
      async (job: Job<SequenceStepJobData>) => {
        logger.info('Processing sequence step job', {
          jobId: job.id,
          data: job.data,
        });

        await processSequenceStepJob(job.data);
      },
      {
        ...getWorkerOptions(),
        concurrency: 10, // Process up to 10 jobs concurrently
      }
    );

    // Event handlers
    sequenceWorker.on('completed', (job) => {
      logger.info('Sequence job completed', {
        jobId: job.id,
        enrollmentId: job.data.enrollmentId,
      });
    });

    sequenceWorker.on('failed', (job, err) => {
      logger.error('Sequence job failed', {
        jobId: job?.id,
        enrollmentId: job?.data.enrollmentId,
        error: err,
      });
    });

    sequenceWorker.on('error', (err) => {
      logger.error('Sequence worker error', { error: err });
    });
  }
  return sequenceWorker;
}

function getAgentWorker(): Worker {
  if (!agentWorker) {
    agentWorker = new Worker(
      'agents',
      async (job: Job<AgentJobData>) => {
        logger.info('Processing agent job', {
          jobId: job.id,
          action: job.data.action,
        });

        const orchestrator = new AgentOrchestrator();

        switch (job.data.action) {
          case 'start-campaign':
            // Run full campaign orchestration
            // This is long-running but acceptable for now in a worker
            return await orchestrator.runFullCampaign(job.data.params);

          case 'run-prospecting':
            const prospectingAgent = new ProspectingAgent();
            return await prospectingAgent.run(job.data.params, job.data.parentTaskId);

          case 'run-research':
            const researchAgent = new ResearchAgent();
            return await researchAgent.generateDossier(job.data.params, job.data.parentTaskId);

          case 'run-content':
            const contentAgent = new ContentPurposingAgent();
            // contentAgent.purposeContent requires 2nd arg accountId if strictly typed,
            // but params should include it. Let's assume params maps correctly.
            // Actually purposeContent signature: purposeContent(request, accountId?, parentTaskId?)
            return await contentAgent.purposeContent(
              job.data.params.request,
              job.data.params.accountId,
              job.data.parentTaskId
            );

          case 'run-graphics':
            const graphicsAgent = new GraphicsAgent();
            return await graphicsAgent.generateGraphic(job.data.params, job.data.parentTaskId);

          case 'run-socials':
            const socialsAgent = new SocialsAgent();
            return await socialsAgent.schedulePost(job.data.params, job.data.parentTaskId);

          case 'run-contracting':
            const contractingAgent = new ContractingAgent();
            return await contractingAgent.generateContract(job.data.params, job.data.parentTaskId);

          default:
            throw new Error(`Unknown agent action: ${job.data.action}`);
        }
      },
      {
        ...getWorkerOptions(),
        concurrency: 2, // Limit concurrent heavy AI agents
      }
    );

    agentWorker.on('completed', (job) => {
      logger.info('Agent job completed', {
        jobId: job.id,
        action: job.data.action,
      });
    });

    agentWorker.on('failed', (job, err) => {
      logger.error('Agent job failed', {
        jobId: job?.id,
        action: job?.data.action,
        error: err,
      });
    });

    agentWorker.on('error', (err) => {
      logger.error('Agent worker error', { error: err });
    });
  }
  return agentWorker;
}

// Health check server for Railway monitoring
const healthServer = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/healthz' || req.url === '/') {
    const enrichment = enrichmentWorker;
    const sequence = sequenceWorker;
    const agents = agentWorker;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'healthy',
        workers: {
          enrichment: enrichment?.isRunning() ? 'running' : 'stopped',
          sequence: sequence?.isRunning() ? 'running' : 'stopped',
          agents: agents?.isRunning() ? 'running' : 'stopped',
        },
        timestamp: new Date().toISOString(),
      })
    );
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

const PORT = process.env.PORT || 8080;
healthServer.listen(PORT, () => {
  logger.info(`Worker health check server listening on port ${PORT}`);
});

// Start workers on module load
function startWorkers() {
  try {
    getEnrichmentWorker();
    getSequenceWorker();
    getAgentWorker();
    logger.info('Queue workers started successfully');
  } catch (error) {
    logger.error('Failed to start workers', { error });
    process.exit(1);
  }
}

startWorkers();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing workers gracefully');
  healthServer.close();
  if (enrichmentWorker) await enrichmentWorker.close();
  if (sequenceWorker) await sequenceWorker.close();
  if (agentWorker) await agentWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing workers gracefully');
  healthServer.close();
  if (enrichmentWorker) await enrichmentWorker.close();
  if (sequenceWorker) await sequenceWorker.close();
  if (agentWorker) await agentWorker.close();
  process.exit(0);
});
