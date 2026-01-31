/**
 * Manifest 2026 Attendee Seed Script
 *
 * This script imports target accounts and people for Manifest 2026 trade show.
 * Run with: npx tsx prisma/seeds/manifest-2026.ts
 *
 * Event: Manifest 2026
 * Date: February 10-12, 2026
 * Location: Las Vegas Convention Center
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

// High-value target accounts for Manifest 2026
// These are logistics, supply chain, and freight companies
const manifestAccounts = [
  // Tier 1: Enterprise Logistics (ICP 90+)
  {
    name: 'XPO Logistics',
    industry: 'Transportation & Logistics',
    website: 'https://www.xpo.com',
    icpScore: 95,
    tier: 'TIER_1',
    employees: '40000+',
    revenue: '$10B+',
    notes: 'Major LTL and brokerage player. Key decision makers attending keynote.',
  },
  {
    name: 'C.H. Robinson',
    industry: 'Freight Brokerage',
    website: 'https://www.chrobinson.com',
    icpScore: 93,
    tier: 'TIER_1',
    employees: '15000+',
    revenue: '$20B+',
    notes: 'Largest freight broker. Multiple VPs confirmed for Manifest.',
  },
  {
    name: 'J.B. Hunt Transport',
    industry: 'Trucking & Intermodal',
    website: 'https://www.jbhunt.com',
    icpScore: 92,
    tier: 'TIER_1',
    employees: '30000+',
    revenue: '$12B+',
    notes: 'Intermodal leader. Interested in yard management solutions.',
  },
  {
    name: 'Flexport',
    industry: 'Digital Freight Forwarding',
    website: 'https://www.flexport.com',
    icpScore: 94,
    tier: 'TIER_1',
    employees: '3000+',
    revenue: '$5B+',
    notes: 'Tech-forward. CEO speaking at main stage.',
  },
  {
    name: 'Convoy',
    industry: 'Digital Freight Network',
    website: 'https://www.convoy.com',
    icpScore: 91,
    tier: 'TIER_1',
    employees: '1000+',
    revenue: '$1B+',
    notes: 'Digital freight marketplace. Looking for yard optimization.',
  },

  // Tier 2: Mid-Market Logistics (ICP 75-89)
  {
    name: 'Saia LTL Freight',
    industry: 'LTL Carrier',
    website: 'https://www.saia.com',
    icpScore: 85,
    tier: 'TIER_2',
    employees: '12000+',
    revenue: '$2.5B+',
    notes: 'Regional LTL. Expanding terminal network.',
  },
  {
    name: 'Echo Global Logistics',
    industry: 'Freight Brokerage',
    website: 'https://www.echo.com',
    icpScore: 82,
    tier: 'TIER_2',
    employees: '2500+',
    revenue: '$4B+',
    notes: 'Technology-focused broker. Open to partnerships.',
  },
  {
    name: 'Transfix',
    industry: 'Digital Freight',
    website: 'https://www.transfix.io',
    icpScore: 80,
    tier: 'TIER_2',
    employees: '500+',
    revenue: '$500M+',
    notes: 'AI-powered freight. Booth near ours.',
  },
  {
    name: 'Loadsmart',
    industry: 'Digital Freight',
    website: 'https://www.loadsmart.com',
    icpScore: 78,
    tier: 'TIER_2',
    employees: '300+',
    revenue: '$300M+',
    notes: 'Instant freight quotes. Interested in visibility tools.',
  },
  {
    name: 'GlobalTranz',
    industry: 'Freight Brokerage',
    website: 'https://www.globaltranz.com',
    icpScore: 76,
    tier: 'TIER_2',
    employees: '1500+',
    revenue: '$2B+',
    notes: 'Growing 3PL. VP of Ops confirmed attendance.',
  },

  // Tier 3: Emerging & Niche Players (ICP 60-74)
  {
    name: 'FreightWaves',
    industry: 'Freight Media & Data',
    website: 'https://www.freightwaves.com',
    icpScore: 70,
    tier: 'TIER_3',
    employees: '200+',
    revenue: '$50M+',
    notes: 'Media partner. Good for visibility. CEO interview opportunity.',
  },
  {
    name: 'Leaf Logistics',
    industry: 'Shipper Platform',
    website: 'https://www.leaflogistics.com',
    icpScore: 68,
    tier: 'TIER_3',
    employees: '100+',
    revenue: '$25M+',
    notes: 'Shipper-focused platform. Complementary solution.',
  },
  {
    name: 'Turvo',
    industry: 'TMS Platform',
    website: 'https://www.turvo.com',
    icpScore: 72,
    tier: 'TIER_3',
    employees: '150+',
    revenue: '$30M+',
    notes: 'Cloud TMS. Potential integration partner.',
  },
  {
    name: 'FourKites',
    industry: 'Supply Chain Visibility',
    website: 'https://www.fourkites.com',
    icpScore: 74,
    tier: 'TIER_3',
    employees: '500+',
    revenue: '$100M+',
    notes: 'Visibility leader. Exploring yard management add-ons.',
  },
  {
    name: 'project44',
    industry: 'Supply Chain Visibility',
    website: 'https://www.project44.com',
    icpScore: 73,
    tier: 'TIER_3',
    employees: '700+',
    revenue: '$150M+',
    notes: 'Visibility platform. Partnership discussions ongoing.',
  },
];

// Key contacts at target accounts
const manifestPeople = [
  // XPO Logistics
  {
    accountName: 'XPO Logistics',
    name: 'Brad Jacobs',
    title: 'Executive Chairman',
    email: 'brad.jacobs@xpo.com',
    priority: 'HIGH',
    notes: 'Founder. Speaking at keynote. 15-min meeting confirmed.',
  },
  {
    accountName: 'XPO Logistics',
    name: 'Mario Harik',
    title: 'Chief Executive Officer',
    email: 'mario.harik@xpo.com',
    priority: 'HIGH',
    notes: 'CEO since 2022. Technology background.',
  },

  // C.H. Robinson
  {
    accountName: 'C.H. Robinson',
    name: 'Dave Bozeman',
    title: 'President & CEO',
    email: 'dave.bozeman@chrobinson.com',
    priority: 'HIGH',
    notes: 'Former Amazon exec. Focus on technology.',
  },
  {
    accountName: 'C.H. Robinson',
    name: 'Arun Rajan',
    title: 'Chief Product & Technology Officer',
    email: 'arun.rajan@chrobinson.com',
    priority: 'HIGH',
    notes: 'Key decision maker for technology investments.',
  },

  // J.B. Hunt
  {
    accountName: 'J.B. Hunt Transport',
    name: 'John Roberts',
    title: 'President & CEO',
    email: 'john.roberts@jbhunt.com',
    priority: 'HIGH',
    notes: 'Long-tenured leader. Focus on intermodal growth.',
  },
  {
    accountName: 'J.B. Hunt Transport',
    name: 'Spencer Frazier',
    title: 'EVP & CTO',
    email: 'spencer.frazier@jbhunt.com',
    priority: 'HIGH',
    notes: 'Tech leader. Interested in yard optimization.',
  },

  // Flexport
  {
    accountName: 'Flexport',
    name: 'Ryan Petersen',
    title: 'Founder & CEO',
    email: 'ryan@flexport.com',
    priority: 'HIGH',
    notes: 'Founder. Very active on Twitter/X. Main stage speaker.',
  },
  {
    accountName: 'Flexport',
    name: 'Dan Glazer',
    title: 'Chief Product Officer',
    email: 'dan.glazer@flexport.com',
    priority: 'MEDIUM',
    notes: 'Product strategy lead.',
  },

  // Convoy
  {
    accountName: 'Convoy',
    name: 'Dan Lewis',
    title: 'Co-founder & CEO',
    email: 'dan@convoy.com',
    priority: 'HIGH',
    notes: 'Co-founder. Deep interest in automation.',
  },

  // Saia
  {
    accountName: 'Saia LTL Freight',
    name: 'Fritz Holzgrefe',
    title: 'President & CEO',
    email: 'fritz.holzgrefe@saia.com',
    priority: 'MEDIUM',
    notes: 'Terminal expansion focus.',
  },

  // Echo Global
  {
    accountName: 'Echo Global Logistics',
    name: 'Doug Waggoner',
    title: 'Chairman & CEO',
    email: 'doug.waggoner@echo.com',
    priority: 'MEDIUM',
    notes: 'Veteran broker. Open to innovation.',
  },

  // Transfix
  {
    accountName: 'Transfix',
    name: 'Lily Shen',
    title: 'CEO',
    email: 'lily.shen@transfix.io',
    priority: 'MEDIUM',
    notes: 'AI-focused leader. Speaking on panel.',
  },

  // FourKites
  {
    accountName: 'FourKites',
    name: 'Mathew Elenjickal',
    title: 'Founder & CEO',
    email: 'mathew@fourkites.com',
    priority: 'MEDIUM',
    notes: 'Visibility pioneer. Partnership potential.',
  },

  // project44
  {
    accountName: 'project44',
    name: 'Jett McCandless',
    title: 'Founder & CEO',
    email: 'jett@project44.com',
    priority: 'MEDIUM',
    notes: 'Growth leader. Aggressive M&A strategy.',
  },

  // FreightWaves
  {
    accountName: 'FreightWaves',
    name: 'Craig Fuller',
    title: 'Founder & CEO',
    email: 'craig@freightwaves.com',
    priority: 'MEDIUM',
    notes: 'Media influence. Interview opportunity.',
  },
];

async function seedManifest2026() {
  console.log('🚀 Starting Manifest 2026 seed...\n');

  // 1. Find or create Manifest 2026 event
  let event = await prisma.events.findFirst({
    where: {
      name: { contains: 'Manifest 2026' },
    },
  });

  if (!event) {
    event = await prisma.events.create({
      data: {
        id: randomUUID(),
        name: 'Manifest 2026',
        startDate: new Date('2026-02-10T08:00:00Z'),
        endDate: new Date('2026-02-12T18:00:00Z'),
        location: 'Las Vegas Convention Center, Las Vegas, NV',
        status: 'PLANNING',
        updatedAt: new Date(),
      },
    });
    console.log(`✅ Created event: ${event.name}`);
  } else {
    console.log(`ℹ️  Found existing event: ${event.name}`);
  }

  // 2. Import target accounts
  console.log('\n📊 Importing target accounts...');
  const accountMap = new Map<string, string>(); // name -> id

  for (const account of manifestAccounts) {
    const existing = await prisma.target_accounts.findFirst({
      where: { name: account.name, eventId: event.id },
    });

    if (existing) {
      console.log(`  ⏭️  Skipping existing: ${account.name}`);
      accountMap.set(account.name, existing.id);
    } else {
      const created = await prisma.target_accounts.create({
        data: {
          id: randomUUID(),
          name: account.name,
          industry: account.industry,
          website: account.website,
          icpScore: account.icpScore,
          eventId: event.id,
          notes: `${account.tier} | ${account.employees} employees | ${account.revenue} revenue | ${account.notes}`,
          updatedAt: new Date(),
        },
      });
      console.log(`  ✅ Created: ${account.name} (ICP: ${account.icpScore}, ${account.tier})`);
      accountMap.set(account.name, created.id);
    }
  }

  // 3. Import key contacts
  console.log('\n👥 Importing key contacts...');

  for (const person of manifestPeople) {
    const accountId = accountMap.get(person.accountName);
    if (!accountId) {
      console.log(`  ⚠️  No account found for: ${person.name} (${person.accountName})`);
      continue;
    }

    const existing = await prisma.people.findFirst({
      where: {
        OR: [{ email: person.email }, { AND: [{ name: person.name }, { accountId }] }],
      },
    });

    if (existing) {
      console.log(`  ⏭️  Skipping existing: ${person.name}`);
    } else {
      await prisma.people.create({
        data: {
          id: randomUUID(),
          name: person.name,
          title: person.title,
          email: person.email,
          accountId,
          notes: `Priority: ${person.priority} | Manifest 2026 | ${person.notes}`,
          updatedAt: new Date(),
        },
      });
      console.log(`  ✅ Created: ${person.name} (${person.title}) - ${person.priority}`);
    }
  }

  // 4. Summary
  const accountCount = await prisma.target_accounts.count({
    where: { eventId: event.id },
  });
  const peopleCount = await prisma.people.count({
    where: { target_accounts: { eventId: event.id } },
  });

  console.log('\n📈 Manifest 2026 Seed Complete!');
  console.log('━'.repeat(40));
  console.log(`  Event: ${event.name}`);
  console.log(`  Accounts: ${accountCount}`);
  console.log(`  People: ${peopleCount}`);
  console.log(`  Date: Feb 10-12, 2026`);
  console.log('━'.repeat(40));
}

// Run the seed
seedManifest2026()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
