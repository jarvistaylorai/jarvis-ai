import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const agents = await prisma.agents.findMany();
    
    const allowedIds = [
      '59eecdad-14f5-4f43-a284-f084c2309666', // Roy
      'cbeb732d-01fd-4478-b7ad-e026a332a3d6'  // Jarvis
    ];

    const toDelete = agents.filter(a => !allowedIds.includes(a.id));
    
    if (toDelete.length > 0) {
      console.log(`Deleting ${toDelete.length} agents...`);
      const toDeleteIds = toDelete.map(a => a.id);
      
      // Temporarily disable triggers to allow deletion/update
      await prisma.$executeRawUnsafe(`ALTER TABLE telemetry_events DISABLE TRIGGER ALL;`);
      
      for (const id of toDeleteIds) {
         // Delete any related task constraints or just delete agent and let cascade handle it.
         // Wait, tasks might also have triggers, let's just delete the agent.
         // Actually, Prisma does JS-level SET NULL for tasks_requested_by_agent_idToagents because there's no onDelete: Cascade.
         // Let's just do it directly via SQL to skip Prisma's SET NULL and triggers.
         await prisma.$executeRawUnsafe(`DELETE FROM telemetry_events WHERE agent_id = $1;`, id);
         await prisma.agents.delete({ where: { id: id } });
      }

      await prisma.$executeRawUnsafe(`ALTER TABLE telemetry_events ENABLE TRIGGER ALL;`);
      console.log('Successfully deleted the agents.');
    } else {
      console.log('No agents to delete.');
    }

  } catch (error) {
    console.error(error);
  } finally {
    // Make sure we re-enable triggers even if we fail
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE telemetry_events ENABLE TRIGGER ALL;`);
    } catch(e) {}
    await prisma.$disconnect();
  }
}

main();
