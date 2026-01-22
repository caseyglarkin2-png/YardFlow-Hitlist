import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create users
  const hashedPassword = await bcrypt.hash('password', 10);

  const casey = await prisma.users.upsert({
    where: { email: 'casey@freightroll.com' },
    update: {},
    create: {
      id: 'user_casey',
      email: 'casey@freightroll.com',
      name: 'Casey Glarkin',
      password: hashedPassword,
      role: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const jake = await prisma.users.upsert({
    where: { email: 'jake@freightroll.com' },
    update: {},
    create: {
      id: 'user_jake',
      email: 'jake@freightroll.com',
      name: 'Jake',
      password: hashedPassword,
      role: 'MEMBER',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Create events
  const manifest2026 = await prisma.events.upsert({
    where: { id: 'manifest-2026' },
    update: {},
    create: {
      id: 'manifest-2026',
      name: 'Manifest 2026',
      location: 'Las Vegas, NV',
      startDate: new Date('2026-02-10'),
      endDate: new Date('2026-02-12'),
      status: 'PLANNING',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Set as active event for users
  await prisma.users.update({
    where: { id: casey.id },
    data: { activeEventId: manifest2026.id },
  });

  await prisma.users.update({
    where: { id: jake.id },
    data: { activeEventId: manifest2026.id },
  });

  // Create sample accounts
  const gxo = await prisma.target_accounts.upsert({
    where: { id: 'sample-gxo' },
    update: {},
    create: {
      id: 'sample-gxo',
      eventId: manifest2026.id,
      name: 'GXO',
      website: 'https://gxo.com',
      industry: 'Logistics',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const stockx = await prisma.target_accounts.upsert({
    where: { id: 'sample-stockx' },
    update: {},
    create: {
      id: 'sample-stockx',
      eventId: manifest2026.id,
      name: 'StockX',
      website: 'https://stockx.com',
      industry: 'E-Commerce',      createdAt: new Date(),
      updatedAt: new Date(),    },
  });

  // Create sample people
  await prisma.people.upsert({
    where: { id: 'person-1' },
    update: {},
    create: {
      id: 'person-1',
      accountId: gxo.id,
      name: 'Jamie Saucedo',
      title: 'Vice President, Business Operations',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  await prisma.people.upsert({
    where: { id: 'person-2' },
    update: {},
    create: {
      id: 'person-2',
      accountId: gxo.id,
      name: 'Kim Kyle',
      title: 'Senior Vice President, Operations',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  await prisma.people.upsert({
    where: { id: 'person-3' },
    update: {},
    create: {
      id: 'person-3',
      accountId: stockx.id,
      name: 'Victor Wilson',
      title: 'VP, Operations',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log('✅ Seeding completed!');
  console.log('\n📧 Test accounts:');
  console.log('  Admin: casey@eventops.com / password');
  console.log('  Member: jake@eventops.com / password');
  console.log('\n🎯 Sample data:');
  console.log(`  Event: ${manifest2026.name}`);
  console.log(`  Accounts: ${gxo.name}, ${stockx.name}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
