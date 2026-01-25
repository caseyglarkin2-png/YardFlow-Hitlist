import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const DATA_DIR = path.join(process.cwd(), 'prisma/seeds/data');
const COMPANY_FILE = 'manifest_companies.csv';
const PEOPLE_FILE = 'manifest_people.csv';

const MANIFEST_EVENT_NAME = 'Manifest Vegas 2026';
const SOURCE_NOTE = 'Source: Manifest2026';

async function seedManifest() {
  console.log('🌱 Starting Manifest 2026 Seed...');

  // 0. Ensure Manifest Event exists
  let event = await prisma.events.findFirst({
    where: { name: MANIFEST_EVENT_NAME },
  });

  if (!event) {
    console.log('Creating Manifest 2026 event...');
    event = await prisma.events.create({
      data: {
        id: randomUUID(),
        name: MANIFEST_EVENT_NAME,
        location: 'Las Vegas, NV',
        startDate: new Date('2026-02-10'),
        endDate: new Date('2026-02-12'),
        status: 'PLANNING',
        updatedAt: new Date(),
      },
    });
  }
  const eventId = event.id;

  // 1. Seed Companies
  const companyPath = path.join(DATA_DIR, COMPANY_FILE);
  if (fs.existsSync(companyPath)) {
    const csv = fs.readFileSync(companyPath, 'utf8');
    const { data } = Papa.parse(csv, { header: true, skipEmptyLines: true });

    console.log('Found ' + data.length + ' companies to seed.');

    for (const row of data as any[]) {
      const name = row['Company']?.trim();
      if (!name) continue;

      const score = parseInt(row['Score'] || '0', 10);
      const tier = row['Tier'] || 'Tier 3';
const notes = SOURCE_NOTE + '\\nTier: ' + tier + '\\nMega Boost: ' + row['mega_boost'];

      // Find by name
      let account = await prisma.target_accounts.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
      });

      if (account) {
        await prisma.target_accounts.update({
          where: { id: account.id },
          data: {
            eventId, // Link to Manifest
            icpScore: score,
            notes: (account.notes || '') + '\n' + notes,
            updatedAt: new Date(),
          },
        });
      } else {
        await prisma.target_accounts.create({
          data: {
            id: randomUUID(),
            name,
            website: 'www.' + name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com',
            industry: 'Logistics',
            eventId,
            icpScore: score,
            notes,
            updatedAt: new Date(),
          },
        });
      }
    }
  } else {
    console.warn('⚠️ Company file not found at ' + companyPath);
  }

  // 2. Seed People
  const peoplePath = path.join(DATA_DIR, PEOPLE_FILE);
  if (fs.existsSync(peoplePath)) {
    const csv = fs.readFileSync(peoplePath, 'utf8');
    const { data } = Papa.parse(csv, { header: true, skipEmptyLines: true });

    console.log('Found ' + data.length + ' people to seed.');

    for (const row of data as any[]) {
      const fullName = row['Name']?.trim();
      if (!fullName) continue;

      const companyName = row['Company']?.trim();
      const title = row['Job Title']?.trim();
      const personScore = row['PersonScore'];
      
      // Find company
      const company = await prisma.target_accounts.findFirst({
        where: { name: { equals: companyName, mode: 'insensitive' } },
      });

      if (!company) {
        // Skip people without accounts for now to keep DB clean
        continue;
      }

      // Generate email guess
      const emailDomain = company.website?.replace(/^www\./, '') || 'example.com';
      const email = fullName.toLowerCase().replace(/\s+/g, '.') + '@' + emailDomain;

      // Check if person exists (by email guess or name+account)
      let person = await prisma.people.findFirst({
        where: {
          OR: [
            { email: { equals: email, mode: 'insensitive' } },
            { 
              AND: [
                { name: { equals: fullName, mode: 'insensitive' } },
                { accountId: company.id }
              ]
            }
          ]
        }
      });

      const roleFlags = {
        isExecOps: row['is_exec_ops'] === 'TRUE',
        isOps: row['is_ops'] === 'TRUE',
        isProc: row['is_proc'] === 'TRUE',
        isSales: row['is_sales'] === 'TRUE',
      };

      if (person) {
        await prisma.people.update({
          where: { id: person.id },
          data: {
            title: title || person.title,
            updatedAt: new Date(),
            ...roleFlags,
          }
        });
      } else {
        await prisma.people.create({
          data: {
            id: randomUUID(),
            accountId: company.id,
            name: fullName,
            email,
            title,
            notes: SOURCE_NOTE + '\\nScore: ' + personScore,
            updatedAt: new Date(),
            ...roleFlags,
          },
        });
      }
    }
  } else {
    console.warn('⚠️ People file not found at ' + peoplePath);
  }

  console.log('✅ Manifest Seed Complete');
}

seedManifest()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
