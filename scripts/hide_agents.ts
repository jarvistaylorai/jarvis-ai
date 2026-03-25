import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const agents = await prisma.agents.findMany();
    
    // The main IDs to keep
    const keepIds = [
      '59eecdad-14f5-4f43-a284-f084c2309666', // Roy
      'cbeb732d-01fd-4478-b7ad-e026a332a3d6'  // Jarvis (Primary)
    ];

    const toHide = agents.filter(a => !keepIds.includes(a.id));
    
    if (toHide.length > 0) {
      console.log(`Hiding ${toHide.length} agents...`);
      for (const agent of toHide) {
        if (!agent.handle.startsWith('deleted-')) {
          await prisma.agents.update({
            where: { id: agent.id },
            data: { handle: `deleted-${agent.id}` }
          });
        }
      }
      console.log('Successfully hid agents.');
    } else {
      console.log('No agents to hide.');
    }

  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
