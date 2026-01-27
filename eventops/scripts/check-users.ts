
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.users.findMany();
    console.log('Users found:', users.length);
    users.forEach(u => console.log(`- ${u.email} (Role: ${u.role})`));
  } catch (error) {
    console.error('Error fetching users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
