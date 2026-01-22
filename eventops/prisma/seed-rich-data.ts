import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Rich sample data for realistic testing
const COMPANIES = [
  { name: 'GXO Logistics', website: 'https://gxo.com', industry: 'Logistics', headquarters: 'Greenwich, CT', icpScore: 95 },
  { name: 'XPO', website: 'https://xpo.com', industry: 'Logistics', headquarters: 'Greenwich, CT', icpScore: 92 },
  { name: 'StockX', website: 'https://stockx.com', industry: 'E-Commerce', headquarters: 'Detroit, MI', icpScore: 88 },
  { name: 'ShipBob', website: 'https://shipbob.com', industry: 'Logistics', headquarters: 'Chicago, IL', icpScore: 90 },
  { name: 'Flexport', website: 'https://flexport.com', industry: 'Logistics', headquarters: 'San Francisco, CA', icpScore: 94 },
  { name: 'FedEx Supply Chain', website: 'https://fedex.com', industry: 'Logistics', headquarters: 'Memphis, TN', icpScore: 85 },
  { name: 'Ryder', website: 'https://ryder.com', industry: 'Logistics', headquarters: 'Miami, FL', icpScore: 87 },
  { name: 'C.H. Robinson', website: 'https://chrobinson.com', industry: 'Logistics', headquarters: 'Eden Prairie, MN', icpScore: 89 },
  { name: 'Kuehne+Nagel', website: 'https://kuehne-nagel.com', industry: 'Logistics', headquarters: 'Schindellegi, Switzerland', icpScore: 91 },
  { name: 'DHL Supply Chain', website: 'https://dhl.com', industry: 'Logistics', headquarters: 'Bonn, Germany', icpScore: 93 },
];

const CONTACTS = [
  // GXO Logistics
  { firstName: 'Jamie', lastName: 'Saucedo', title: 'VP, Business Operations', email: 'jamie.saucedo@gxo.com', isOps: true },
  { firstName: 'Kim', lastName: 'Kyle', title: 'SVP, Operations', email: 'kim.kyle@gxo.com', isExecOps: true },
  { firstName: 'Sarah', lastName: 'Chen', title: 'Director, Warehouse Operations', email: 'sarah.chen@gxo.com', isOps: true },
  
  // XPO
  { firstName: 'Michael', lastName: 'Torres', title: 'Chief Operations Officer', email: 'mtorres@xpo.com', isExecOps: true },
  { firstName: 'Jennifer', lastName: 'Walsh', title: 'VP, Supply Chain', email: 'jwalsh@xpo.com', isOps: true },
  { firstName: 'David', lastName: 'Park', title: 'Director, Procurement', email: 'dpark@xpo.com', isProc: true },
  
  // StockX
  { firstName: 'Victor', lastName: 'Wilson', title: 'VP, Operations', email: 'vwilson@stockx.com', isOps: true },
  { firstName: 'Amanda', lastName: 'Foster', title: 'Director, Fulfillment', email: 'afoster@stockx.com', isOps: true },
  { firstName: 'Carlos', lastName: 'Rodriguez', title: 'Head of Technology', email: 'crodriguez@stockx.com', isTech: true },
  
  // ShipBob
  { firstName: 'Rachel', lastName: 'Kim', title: 'SVP, Operations', email: 'rkim@shipbob.com', isExecOps: true },
  { firstName: 'Thomas', lastName: 'Anderson', title: 'VP, Sales', email: 'tanderson@shipbob.com', isSales: true },
  { firstName: 'Lisa', lastName: 'Martinez', title: 'Director, Operations', email: 'lmartinez@shipbob.com', isOps: true },
  
  // Flexport
  { firstName: 'Daniel', lastName: 'Brown', title: 'Chief Operating Officer', email: 'dbrown@flexport.com', isExecOps: true },
  { firstName: 'Emily', lastName: 'Thompson', title: 'VP, Technology', email: 'ethompson@flexport.com', isTech: true },
  { firstName: 'Robert', lastName: 'Lee', title: 'Director, Procurement', email: 'rlee@flexport.com', isProc: true },
  
  // FedEx Supply Chain
  { firstName: 'Michelle', lastName: 'Davis', title: 'SVP, Operations', email: 'mdavis@fedex.com', isExecOps: true },
  { firstName: 'James', lastName: 'Garcia', title: 'VP, Business Development', email: 'jgarcia@fedex.com', isSales: true },
  { firstName: 'Patricia', lastName: 'Miller', title: 'Director, Operations', email: 'pmiller@fedex.com', isOps: true },
  
  // Ryder
  { firstName: 'Christopher', lastName: 'Wilson', title: 'COO', email: 'cwilson@ryder.com', isExecOps: true },
  { firstName: 'Angela', lastName: 'Moore', title: 'VP, Operations', email: 'amoore@ryder.com', isOps: true },
  { firstName: 'Kevin', lastName: 'Taylor', title: 'Director, Sales', email: 'ktaylor@ryder.com', isSales: true },
  
  // C.H. Robinson
  { firstName: 'Laura', lastName: 'Anderson', title: 'SVP, Operations', email: 'landerson@chrobinson.com', isExecOps: true },
  { firstName: 'Brian', lastName: 'Thomas', title: 'VP, Technology', email: 'bthomas@chrobinson.com', isTech: true },
  { firstName: 'Nancy', lastName: 'Jackson', title: 'Director, Procurement', email: 'njackson@chrobinson.com', isProc: true },
  
  // Kuehne+Nagel
  { firstName: 'William', lastName: 'Harris', title: 'Chief Operations Officer', email: 'wharris@kuehne-nagel.com', isExecOps: true },
  { firstName: 'Susan', lastName: 'Clark', title: 'VP, Operations', email: 'sclark@kuehne-nagel.com', isOps: true },
  { firstName: 'Richard', lastName: 'Lewis', title: 'Director, Sales', email: 'rlewis@kuehne-nagel.com', isSales: true },
  
  // DHL Supply Chain
  { firstName: 'Barbara', lastName: 'Robinson', title: 'SVP, Global Operations', email: 'brobinson@dhl.com', isExecOps: true },
  { firstName: 'Joseph', lastName: 'Walker', title: 'VP, Technology', email: 'jwalker@dhl.com', isTech: true },
  { firstName: 'Elizabeth', lastName: 'Hall', title: 'Director, Business Operations', email: 'ehall@dhl.com', isOps: true },
];

async function main() {
  console.log('🌱 Seeding rich sample data...\n');

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

  // Create event
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

  // Set active event
  await prisma.users.update({
    where: { id: casey.id },
    data: { activeEventId: manifest2026.id },
  });

  console.log(`✅ Created event: ${manifest2026.name}`);
  console.log('');

  // Create companies and contacts
  let contactIndex = 0;
  
  for (let i = 0; i < COMPANIES.length; i++) {
    const company = COMPANIES[i];
    
    const account = await prisma.target_accounts.create({
      data: {
        id: `acc-${i + 1}`,
        eventId: manifest2026.id,
        name: company.name,
        website: company.website,
        industry: company.industry,
        headquarters: company.headquarters,
        icpScore: company.icpScore,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log(`✓ Created account: ${company.name} (ICP: ${company.icpScore})`);

    // Add 3 contacts per company
    const companyContacts = CONTACTS.slice(contactIndex, contactIndex + 3);
    contactIndex += 3;

    for (const contact of companyContacts) {
      await prisma.people.create({
        data: {
          id: `person-${Math.random().toString(36).substr(2, 9)}`,
          accountId: account.id,
          name: `${contact.firstName} ${contact.lastName}`,
          title: contact.title,
          email: contact.email,
          isExecOps: contact.isExecOps || false,
          isOps: contact.isOps || false,
          isProc: contact.isProc || false,
          isSales: contact.isSales || false,
          isTech: contact.isTech || false,
          isNonOps: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }
  }

  console.log('');
  console.log('✅ Seeding completed!');
  console.log('');
  console.log('📊 Summary:');
  console.log(`  - 1 Event: ${manifest2026.name}`);
  console.log(`  - ${COMPANIES.length} Target Accounts`);
  console.log(`  - ${CONTACTS.length} Contacts`);
  console.log('');
  console.log('🔐 Login:');
  console.log('  Email: casey@freightroll.com');
  console.log('  Password: password');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
