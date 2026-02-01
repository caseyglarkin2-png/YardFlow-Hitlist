// Run with: npx tsx --import 'tsconfig-paths/register' scripts/create-user.ts
// Or: railway run npx tsx scripts/create-user.ts
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Check existing users
  console.log('Checking existing users...');
  const existingUsers = await prisma.users.findMany({ take: 10 });
  console.log('Existing users:', existingUsers.map(u => ({ 
    id: u.id, 
    email: u.email, 
    name: u.name, 
    hasPassword: !!u.password 
  })));

  // Create or update Casey user
  const hashedPassword = await bcrypt.hash('password', 10);
  
  const casey = await prisma.users.upsert({
    where: { email: 'casey@freightroll.com' },
    update: { 
      password: hashedPassword,
      name: 'Casey Glarkin',
      role: 'ADMIN',
      updatedAt: new Date(),
    },
    create: {
      id: randomUUID(),
      email: 'casey@freightroll.com',
      name: 'Casey Glarkin',
      password: hashedPassword,
      role: 'ADMIN',
      updatedAt: new Date(),
    },
  });

  console.log('User created/updated:', {
    id: casey.id,
    email: casey.email,
    name: casey.name,
    role: casey.role,
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
