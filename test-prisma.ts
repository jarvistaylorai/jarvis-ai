import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
async function main() {
  const ag = await prisma.agents.findFirst();
  console.log('AGENT:', ag);

  const proj = await prisma.projects.findFirst();
  console.log('PROJECT:', proj);
}
main().finally(() => prisma.$disconnect());
