import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create users
  const hashedPassword = await bcrypt.hash('password', 10);

  const casey = await prisma.user.upsert({
    where: { email: 'casey@freightroll.com' },
    update: {},
    create: {
      email: 'casey@freightroll.com',
      name: 'Casey Glarkin',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  const jake = await prisma.user.upsert({
    where: { email: 'jake@freightroll.com' },
    update: {},
    create: {
      email: 'jake@freightroll.com',
      name: 'Jake',
      password: hashedPassword,
      role: 'MEMBER',
    },
  });

  // Create events
  const manifest2026 = await prisma.event.upsert({
    where: { id: 'manifest-2026' },
    update: {},
    create: {
      id: 'manifest-2026',
      name: 'Manifest 2026',
      location: 'Las Vegas, NV',
      startDate: new Date('2026-02-10'),
      endDate: new Date('2026-02-12'),
      status: 'ACTIVE',
    },
  });

  // Set as active event for users
  await prisma.user.update({
    where: { id: casey.id },
    data: { activeEventId: manifest2026.id },
  });

  await prisma.user.update({
    where: { id: jake.id },
    data: { activeEventId: manifest2026.id },
  });

  // Create sample accounts
  const gxo = await prisma.targetAccount.upsert({
    where: { id: 'sample-gxo' },
    update: {},
    create: {
      id: 'sample-gxo',
      eventId: manifest2026.id,
      name: 'GXO',
      website: 'https://gxo.com',
      industry: 'Logistics',
    },
  });

  const stockx = await prisma.targetAccount.upsert({
    where: { id: 'sample-stockx' },
    update: {},
    create: {
      id: 'sample-stockx',
      eventId: manifest2026.id,
      name: 'StockX',
      website: 'https://stockx.com',
      industry: 'E-Commerce',
    },
  });

  // Create sample people
  await prisma.person.upsert({
    where: { id: 'person-1' },
    update: {},
    create: {
      id: 'person-1',
      accountId: gxo.id,
      name: 'Jamie Saucedo',
      title: 'Vice President, Business Operations',
    },
  });

  await prisma.person.upsert({
    where: { id: 'person-2' },
    update: {},
    create: {
      id: 'person-2',
      accountId: gxo.id,
      name: 'Kim Kyle',
      title: 'Senior Vice President, Operations',
    },
  });

  await prisma.person.upsert({
    where: { id: 'person-3' },
    update: {},
    create: {
      id: 'person-3',
      accountId: stockx.id,
      name: 'Victor Wilson',
      title: 'VP, Operations',
    },
  });

  console.log('✅ Seeding completed!');
  console.log('\n📧 Test accounts:');
  console.log('  Admin: casey@eventops.com / password');
  console.log('  Member: jake@eventops.com / password');
  console.log('\n🎯 Sample data:');
  console.log(`  Event: ${manifest2026.name}`);
  console.log(`  Accounts: ${gxo.companyName}, ${stockx.companyName}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
