import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function collectMetrics() {
  console.log('📊 Collecting baseline metrics...\n');

  try {
    const [
      accountCount,
      peopleCount,
      dossierCount,
    ] = await Promise.all([
      prisma.target_accounts.count(),
      prisma.people.count(),
      prisma.company_dossiers.count(),
    ]);

    // Get average ICP score
    const avgICP = await prisma.target_accounts.aggregate({
      _avg: { icpScore: true },
      where: { icpScore: { not: null } },
    });

    const metrics = {
      timestamp: new Date().toISOString(),
      database: {
        accounts: {
          total: accountCount,
          withDossiers: dossierCount,
          avgIcpScore: Math.round((avgICP._avg.icpScore ?? 0) * 10) / 10,
        },
        people: peopleCount,
      },
    };

    console.log('Baseline Metrics:');
    console.log(JSON.stringify(metrics, null, 2));

    // Save to file
    fs.writeFileSync(
      'scripts/baseline-metrics.json',
      JSON.stringify(metrics, null, 2)
    );

    console.log('\n✅ Metrics saved to scripts/baseline-metrics.json');
  } catch (error) {
    console.error('Error collecting metrics:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

collectMetrics();
