const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Looking for 'Jarvis' and 'Build Jarvis'");

    const buildJarvis = await prisma.projects.findFirst({
        where: { name: 'Build Jarvis' }
    });

    const newJarvis = await prisma.projects.findFirst({
        where: { name: 'Jarvis', status: 'planned' }
    });

    if (buildJarvis && newJarvis) {
        console.log(`Consolidating ${newJarvis.id} into ${buildJarvis.id}`);
        
        // Move Objectives
        await prisma.objectives.updateMany({
            where: { project_id: newJarvis.id },
            data: { project_id: buildJarvis.id }
        });

        // Move Tasks
        await prisma.tasks.updateMany({
            where: { project_id: newJarvis.id },
            data: { project_id: buildJarvis.id }
        });

        // We can safely rename the old newJarvis to hide it
        await prisma.projects.update({
            where: { id: newJarvis.id },
            data: { 
                name: `(Archived) Jarvis`,
                status: 'paused'
            }
        });

        console.log("Successfully consolidated Jarvis into Build Jarvis!");
    } else {
        console.log("Could not find both projects.");
    }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
