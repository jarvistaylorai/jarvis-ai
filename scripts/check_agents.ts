import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const agents = await prisma.agents.findMany();
    
    console.log("All current agents:");
    agents.forEach(a => console.log(`- ${a.name} (handle: ${a.handle}, id: ${a.id}, kind: ${a.kind})`));

    const royTaylor = agents.find(a => a.handle === 'roy-taylor' || a.name.toLowerCase() === 'roy-taylor');
    if (royTaylor) {
      console.log("\nDetails about roy-taylor:");
      console.log(JSON.stringify(royTaylor, null, 2));

      // Check context files
      const contextFiles = await prisma.agent_context_files.findMany({
        where: { agent_id: royTaylor.id }
      });
      console.log(`\nFound ${contextFiles.length} context files for roy-taylor.`);

      // Delete it
      await prisma.agents.delete({
        where: { id: royTaylor.id }
      });
      console.log("\nDeleted roy-taylor agent.");
    } else {
      console.log("\nCouldn't find an agent strictly named 'roy-taylor'.");
    }

    // Clean up any others except "roy" and "jarvis"
    const allowedHandles = ['roy', 'jarvis'];
    const toDelete = agents.filter(a => !allowedHandles.includes(a.handle) && a.id !== royTaylor?.id);
    
    if (toDelete.length > 0) {
      console.log(`\nDeleting other agents: ${toDelete.map(a => a.handle).join(', ')}`);
      for (const agent of toDelete) {
        await prisma.agents.delete({ where: { id: agent.id } });
      }
    }

  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
