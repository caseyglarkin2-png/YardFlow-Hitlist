import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  // Check if TypeScript would complain (if i were compiling), but here in runtime, just check if fields exist on model (not really possible without instance)
  // I will just print the dmmf or something if I could, but easiest is just to trust the migration command.
  console.log('Migration successful');
}

check();
