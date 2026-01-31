import { prisma } from '../../src/lib/db';
import { randomUUID } from 'crypto';

/*
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
*/

/*
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}
console.log('Using connection string:', connectionString.replace(/:[^:@]+@/, ':***@'));

const pool = new Pool({ 
  user: 'eventops',
  password: 'eventops',
  host: 'localhost',
  port: 5432,
  database: 'eventops',
});
const adapter = new PrismaPg({ pool });
const prisma = new PrismaClient({ adapter });
*/

const MANIFEST_EVENT = {
  id: 'evt_manifest_2026',
  name: "Manifest 2026",
  startDate: new Date("2026-02-10T09:00:00Z"),
  endDate: new Date("2026-02-12T17:00:00Z"),
  location: "Las Vegas, NV",
  status: "PLANNING" as const, 
};

const ACCOUNTS = [
  // Tier 1: Enterprise Logistics
  {
    name: 'XPO Logistics',
    industry: 'Transportation & Logistics',
    website: 'https://www.xpo.com',
    icpScore: 95,
    notes: 'Tier 1: Major LTL and brokerage player. Key decision makers attending keynote.',
    people: [
      { name: 'Mario Harik', title: 'CEO', email: 'mario.harik@xpo.com' },
      { name: 'David Bates', title: 'COO', email: 'david.bates@xpo.com' },
      { name: 'Jay Silberkleit', title: 'CIO', email: 'jay.silberkleit@xpo.com' },
    ]
  },
  {
    name: 'C.H. Robinson',
    industry: 'Freight Brokerage',
    website: 'https://www.chrobinson.com',
    icpScore: 93,
    notes: 'Tier 1: Largest freight broker. Multiple VPs confirmed for Manifest.',
    people: [
      { name: 'Dave Bozeman', title: 'CEO', email: 'dave.bozeman@chrobinson.com' },
      { name: 'Mike Zechmeister', title: 'CFO', email: 'mike.z@chrobinson.com' },
    ]
  },
  {
    name: 'J.B. Hunt Transport',
    industry: 'Trucking & Intermodal',
    website: 'https://www.jbhunt.com',
    icpScore: 92,
    notes: 'Tier 1: Intermodal leader. Interested in yard management solutions.',
    people: [
      { name: 'Shelley Simpson', title: 'President', email: 'shelley.simpson@jbhunt.com' },
      { name: 'Nick Hobbs', title: 'COO', email: 'nick.hobbs@jbhunt.com' },
    ]
  },
  {
    name: 'Flexport',
    industry: 'Digital Freight Forwarding',
    website: 'https://www.flexport.com',
    icpScore: 94,
    notes: 'Tier 1: Tech-forward. CEO speaking at main stage.',
    people: [
      { name: 'Ryan Petersen', title: 'CEO', email: 'ryan@flexport.com' },
      { name: 'Parisa Sadrzadeh', title: 'EVP SMB Product', email: 'parisa@flexport.com' },
    ]
  },
  // Tier 2: Mid-Market / Digital
  {
    name: 'Convoy',
    industry: 'Digital Freight Network',
    website: 'https://www.convoy.com',
    icpScore: 91,
    notes: 'Tier 2: Digital freight marketplace. Looking for yard optimization.',
    people: [
      { name: 'Dan Lewis', title: 'CEO', email: 'dan@convoy.com' },
      { name: 'Grant Goodale', title: 'Experience Officer', email: 'grant@convoy.com' },
    ]
  },
  {
    name: 'Saia LTL Freight',
    industry: 'LTL Carrier',
    website: 'https://www.saia.com',
    icpScore: 85,
    notes: 'Tier 2: Regional LTL. Expanding terminal network.',
    people: [
      { name: 'Fritz Holzgrefe', title: 'CEO', email: 'fritz@saia.com' },
    ]
  },
  {
    name: 'Echo Global Logistics',
    industry: 'Freight Brokerage',
    website: 'https://www.echo.com',
    icpScore: 82,
    notes: 'Tier 2: Technology-focused broker. Open to partnerships.',
    people: [
      { name: 'Doug Waggoner', title: 'CEO', email: 'doug@echo.com' },
      { name: 'Dave Menzel', title: 'COO', email: 'dave@echo.com' },
    ]
  },
  // Tier 3 / Others
  {
    name: 'Prologis',
    industry: 'Real Estate Logistics',
    website: 'https://www.prologis.com',
    icpScore: 89,
    notes: 'Tier 1: Real Estate Giant. Ventures arm active.',
    people: [
      { name: 'Hamid Moghadam', title: 'CEO', email: 'hamid@prologis.com' },
    ]
  },
  {
    name: 'Uber Freight',
    industry: 'Digital Brokers',
    website: 'https://www.uberfreight.com',
    icpScore: 88,
    notes: 'Tier 2: Massive network.',
    people: [
      { name: 'Lior Ron', title: 'CEO', email: 'lior@uberfreight.com' },
    ]
  },
  {
    name: 'Transfix',
    industry: 'Digital Freight',
    website: 'https://www.transfix.io',
    icpScore: 80,
    notes: 'Tier 3: Smaller digital player.',
    people: [
      { name: 'Jonathan Salama', title: 'CEO', email: 'jonathan@transfix.io' },
    ]
  }
];

const MEETING_TYPES = ["Intro", "Demo", "Discovery", "Coffee", "Dinner"];

async function main() {
  console.log('🎰 Seeding Manifest 2026 data...');

  // 1. Create/Update Event
  const event = await prisma.events.upsert({
    where: { id: MANIFEST_EVENT.id },
    update: {
        ...MANIFEST_EVENT,
        updatedAt: new Date(),
    },
    create: {
      ...MANIFEST_EVENT,
      updatedAt: new Date(),
    }
  });
  console.log(`✅ Event: ${event.name}`);

  // 2. Accounts & People
  const peopleIds: string[] = [];

  for (const acc of ACCOUNTS) {
    // Deterministic ID for upsert
    const accountId = `acc_${acc.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    
    const account = await prisma.target_accounts.upsert({
      where: { id: accountId },
      update: {
        eventId: event.id,
        name: acc.name,
        industry: acc.industry,
        website: acc.website,
        icpScore: acc.icpScore,
        notes: acc.notes,
        updatedAt: new Date(),
      },
      create: {
        id: accountId,
        eventId: event.id,
        name: acc.name,
        industry: acc.industry,
        website: acc.website,
        icpScore: acc.icpScore,
        notes: acc.notes,
        updatedAt: new Date(),
      }
    });

    for (const p of acc.people) {
      // Determine roles
      const title = p.title.toLowerCase();
      const isExecOps = title.includes('ceo') || title.includes('coo') || title.includes('vp') || title.includes('president') || title.includes('officer');
      const isOps = title.includes('oper') || title.includes('logist') || title.includes('supply');
      const isProc = title.includes('procu');
      const isTech = title.includes('cto') || title.includes('tech') || title.includes('cio');
      
      // Let's use findFirst to find by email to get ID if exists.
      const existingPerson = await prisma.people.findFirst({
        where: { email: p.email }
      });
      
      const personId = existingPerson?.id || `ppl_${randomUUID()}`;

      const person = await prisma.people.upsert({
        where: { id: personId },
        update: {
            accountId: account.id,
            name: p.name,
            title: p.title,
            email: p.email,
            isExecOps: !!isExecOps,
            isOps: !!isOps,
            isProc: !!isProc,
            isTech: !!isTech,
            updatedAt: new Date(),
        },
        create: {
          id: personId,
          accountId: account.id,
          name: p.name,
          title: p.title,
          email: p.email,
          isExecOps: !!isExecOps,
          isOps: !!isOps,
          isProc: !!isProc,
          isTech: !!isTech,
          updatedAt: new Date(),
        }
      });
      peopleIds.push(person.id);
    }
  }
  console.log(`✅ Accounts & People created.`);

  // 3. Meetings
  if (peopleIds.length === 0) return;

  const today = new Date();
  today.setHours(9, 0, 0, 0); // 9 AM Today
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1); // 9 AM Tomorrow

  async function createMeetings(baseDate: Date, count: number, label: string) {
    console.log(`Scheduling ${count} meetings for ${label} (starting ${baseDate.toLocaleString()})...`);
    for (let i = 0; i < count; i++) {
        const personId = peopleIds[Math.floor(Math.random() * peopleIds.length)];
        const hourOffset = i; // 0, 1, 2... hours after base
        const startTime = new Date(baseDate);
        startTime.setHours(baseDate.getHours() + hourOffset);
        
        const meetingId = `mtg_manifest_${label.toLowerCase()}_${i}`;

        await prisma.meeting.upsert({
            where: { id: meetingId },
            update: {
                personId, // Update person (might change if random)
                scheduledAt: startTime,
            },
            create: {
                id: meetingId,
                personId,
                scheduledAt: startTime,
                duration: 30,
                status: 'SCHEDULED',
                meetingType: MEETING_TYPES[Math.floor(Math.random() * MEETING_TYPES.length)],
                notes: `Manifest 2026 Meetup - ${label}`,
                updatedAt: new Date(),
            }
        });
    }
  }

  await createMeetings(today, 5, "Today");
  await createMeetings(tomorrow, 5, "Tomorrow");
  
  console.log(`✅ Meetings scheduled.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
