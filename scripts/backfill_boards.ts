import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const defaultColumns = ['Ideas', 'To-Do', 'Doing', 'Under Review', 'Done'];

  console.log('Checking global lists...');
  const globalLists = await prisma.taskList.findMany({ where: { project_id: 'global' } });
  if (globalLists.length === 0) {
    console.log('Backfilling global lists...');
    await prisma.$transaction(
      defaultColumns.map((name, index) => 
        prisma.taskList.create({
          data: { project_id: 'global', name, position: (index + 1) * 1024 }
        })
      )
    );
  } else {
    console.log('Global lists already exist.');
  }

  const projects = await prisma.project.findMany();
  console.log(`Checking ${projects.length} projects...`);

  for (const project of projects) {
    const lists = await prisma.taskList.findMany({ where: { project_id: project.id } });
    if (lists.length === 0) {
      console.log(`Backfilling project ${project.name} (${project.id})...`);
      await prisma.$transaction(
        defaultColumns.map((name, index) => 
          prisma.taskList.create({
            data: { project_id: project.id, name, position: (index + 1) * 1024 }
          })
        )
      );
    } else {
      console.log(`Project ${project.name} already has ${lists.length} lists.`);
    }
  }

  console.log('Backfill complete.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
