import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');
  console.log('⚠️  This will create sample data for testing\n');

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

  console.log('✅ Created 2 users');

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

  const modex2026 = await prisma.events.upsert({
    where: { id: 'modex-2026' },
    update: {},
    create: {
      id: 'modex-2026',
      name: 'MODEX 2026',
      location: 'Atlanta, GA',
      startDate: new Date('2026-03-15'),
      endDate: new Date('2026-03-18'),
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

  console.log('✅ Created 2 events');

  // Create sample accounts
  const accounts = [
    {
      id: 'sample-gxo',
      eventId: manifest2026.id,
      name: 'GXO Logistics',
      website: 'https://gxo.com',
      
      industry: '3PL Logistics',
      icpScore: 92,
      
      assignedTo: casey.id,
    },
    {
      id: 'sample-stockx',
      eventId: manifest2026.id,
      name: 'StockX',
      website: 'https://stockx.com',
      
      industry: 'E-Commerce',
      icpScore: 88,
      
      assignedTo: casey.id,
    },
    {
      id: 'sample-amazon',
      eventId: manifest2026.id,
      name: 'Amazon Fulfillment',
      website: 'https://amazon.com',
      
      industry: 'E-Commerce',
      icpScore: 95,
      
      assignedTo: jake.id,
    },
    {
      id: 'sample-fedex',
      eventId: modex2026.id,
      name: 'FedEx Supply Chain',
      website: 'https://fedex.com',
      
      industry: 'Logistics',
      icpScore: 90,
      
      assignedTo: casey.id,
    },
    {
      id: 'sample-shopify',
      eventId: modex2026.id,
      name: 'Shopify Fulfillment',
      website: 'https://shopify.com',
      
      industry: 'E-Commerce Platform',
      icpScore: 85,
      
      assignedTo: jake.id,
    },
  ];

  const createdAccounts = [];
  for (const account of accounts) {
    const created = await prisma.target_accounts.upsert({
      where: { id: account.id },
      update: {},
      create: {
        ...account,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    createdAccounts.push(created);
  }

  const [gxo, stockx, amazon, fedex, shopify] = createdAccounts;
  console.log(`✅ Created ${accounts.length} target accounts`);

  // Create sample people
  const people = [
    // GXO
    { id: 'person-1', accountId: gxo.id, name: 'Jamie Saucedo', title: 'VP Business Operations', email: 'jamie.saucedo@gxo.com', isOps: true, assignedTo: casey.id },
    { id: 'person-2', accountId: gxo.id, name: 'Kim Kyle', title: 'SVP Operations', email: 'kim.kyle@gxo.com', isExecOps: true, assignedTo: casey.id },
    // StockX
    { id: 'person-3', accountId: stockx.id, name: 'Victor Wilson', title: 'VP Operations', email: 'victor.wilson@stockx.com', isOps: true, assignedTo: casey.id },
    { id: 'person-4', accountId: stockx.id, name: 'Sarah Chen', title: 'Director Supply Chain', email: 'sarah.chen@stockx.com', isOps: true, assignedTo: casey.id },
    // Amazon
    { id: 'person-5', accountId: amazon.id, name: 'Michael Roberts', title: 'Director Fulfillment Operations', email: 'michael.roberts@amazon.com', isExecOps: true, assignedTo: jake.id },
    { id: 'person-6', accountId: amazon.id, name: 'Jennifer Lee', title: 'Sr Manager Warehouse Operations', email: 'jennifer.lee@amazon.com', isOps: true, assignedTo: jake.id },
    // FedEx
    { id: 'person-7', accountId: fedex.id, name: 'David Martinez', title: 'VP Supply Chain', email: 'david.martinez@fedex.com', isExecOps: true, assignedTo: casey.id },
    { id: 'person-8', accountId: fedex.id, name: 'Lisa Thompson', title: 'Director Operations Planning', email: 'lisa.thompson@fedex.com', isOps: true, assignedTo: casey.id },
    // Shopify
    { id: 'person-9', accountId: shopify.id, name: 'Alex Patel', title: 'Director Logistics', email: 'alex.patel@shopify.com', isOps: true, assignedTo: jake.id },
    { id: 'person-10', accountId: shopify.id, name: 'Emily Zhang', title: 'Manager Fulfillment Network', email: 'emily.zhang@shopify.com', isOps: true, assignedTo: jake.id },
  ];

  for (const person of people) {
    await prisma.people.upsert({
      where: { id: person.id },
      update: {},
      create: {
        ...person,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  console.log(`✅ Created ${people.length} contacts`);

  // Create email patterns for some accounts
  await prisma.email_patterns.upsert({
    where: { id: 'pattern-gxo' },
    update: {},
    create: {
      id: 'pattern-gxo',
      accountId: gxo.id,
      companyDomain: 'gxo.com',
      patternType: 'firstlast',
      confidence: 0.9,
      examples: ['jamie.saucedo@gxo.com'],
      sampleSize: 1,
      createdAt: new Date(),
    },
  });

  await prisma.email_patterns.upsert({
    where: { id: 'pattern-stockx' },
    update: {},
    create: {
      id: 'pattern-stockx',
      accountId: stockx.id,
      companyDomain: 'stockx.com',
      patternType: 'firstlast',
      confidence: 0.9,
      examples: ['victor.wilson@stockx.com'],
      sampleSize: 1,
      createdAt: new Date(),
    },
  });

  console.log('✅ Created email patterns');

  // Create a sample campaign
  const campaign = await prisma.campaigns.upsert({
    where: { id: 'campaign-manifest' },
    update: {},
    create: {
      id: 'campaign-manifest',
      eventId: manifest2026.id,
      name: 'Manifest 2026 Outreach',
      description: 'Multi-touch outreach campaign for Manifest attendees',
      targetPersonas: 'VP Operations, Director Supply Chain',
      minIcpScore: 80,
      status: 'ACTIVE',
      createdBy: casey.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log('✅ Created sample campaign');

  console.log('\n' + '='.repeat(60));
  console.log('🎉 SEEDING COMPLETED SUCCESSFULLY!\n');
  console.log('📧 Test Accounts:');
  console.log('  ├─ Admin:  casey@freightroll.com / password');
  console.log('  └─ Member: jake@freightroll.com / password\n');
  console.log('🎯 Sample Data:');
  console.log(`  ├─ Events: ${manifest2026.name}, ${modex2026.name}`);
  console.log(`  ├─ Accounts: ${accounts.length} companies`);
  console.log(`  ├─ Contacts: ${people.length} people`);
  console.log(`  ├─ Campaigns: 1 active campaign`);
  console.log(`  └─ Email Patterns: 2 patterns`);
  console.log('='.repeat(60) + '\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
