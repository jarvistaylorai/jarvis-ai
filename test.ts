import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const models = await prisma.model.findMany({
      include: {
        usage_logs: true,
        configs_as_primary: { include: { agent: true } },
        configs_as_fallback: { include: { agent: true } }
      }
    });
    console.log("Success! Models:", models.length);
  } catch (e) {
    console.error("Prisma error:", e);
  }
}

main().finally(() => prisma.$disconnect());
