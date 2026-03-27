import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up duplicates...');
  
  // 1. Projects
  const allProjects = await prisma.projects.findMany({
    include: { tasks: { select: { id: true } } }
  });
  
  const pMap = new Map<string, unknown[]>();
  for (const p of allProjects) {
    if (!pMap.has(p.name)) pMap.set(p.name, []);
    pMap.get(p.name)!.push(p);
  }
  
  for (const [name, dupes] of Array.from(pMap.entries())) {
    if (dupes.length > 1) {
      console.log(`Found ${dupes.length} duplicates for Project: ${name}`);
      dupes.sort((a, b) => b.tasks.length - a.tasks.length);
      const toKeep = dupes[0];
      const toDelete = dupes.slice(1).map(d => d.id);
      console.log(`  Keeping: ${toKeep.id}, Pruning: ${toDelete.join(', ')}`);
      for (const t of toDelete) {
        try {
          await prisma.$executeRawUnsafe(`DELETE FROM projects WHERE id = '${t}'`);
        } catch (e: unknown) {
          if (e.message.includes('violates foreign key constraint')) {
            await prisma.projects.update({ where: { id: t }, data: { name: `[ORPHANED] ${name}`, status: 'paused' } });
            console.log(`    Renamed project ${t} instead due to constraint`);
          } else {
            console.error(e);
          }
        }
      }
    }
  }

  // 2. Agents
  const allAgents = await prisma.agents.findMany({
    include: { tasks_tasks_assigned_agent_idToagents: { select: { id: true } } }
  });

  const aMap = new Map<string, unknown[]>();
  for (const a of allAgents) {
    if (!aMap.has(a.name)) aMap.set(a.name, []);
    aMap.get(a.name)!.push(a);
  }

  for (const [name, dupes] of Array.from(aMap.entries())) {
    if (dupes.length > 1) {
      console.log(`Found ${dupes.length} duplicates for Agent: ${name}`);
      dupes.sort((a, b) => b.tasks_tasks_assigned_agent_idToagents.length - a.tasks_tasks_assigned_agent_idToagents.length);
      const toKeep = dupes[0];
      const toDelete = dupes.slice(1).map(d => d.id);
      console.log(`  Keeping: ${toKeep.id}, Pruning: ${toDelete.join(', ')}`);
      for (const t of toDelete) {
        try {
          await prisma.$executeRawUnsafe(`DELETE FROM agents WHERE id = '${t}'`);
        } catch (e: unknown) {
          if (e.message.includes('violates foreign key constraint')) {
            await prisma.agents.update({ where: { id: t }, data: { name: `[ORPHANED] ${name}`, status: 'offline' } });
            console.log(`    Renamed agent ${t} instead due to constraint`);
          }
        }
      }
    }
  }

  // 3. Objectives
  const allObjectives = await prisma.objectives.findMany();
  const objMap = new Map<string, unknown[]>();
  for (const o of allObjectives) {
    if (!objMap.has(o.title)) objMap.set(o.title, []);
    objMap.get(o.title)!.push(o);
  }

  for (const [title, dupes] of Array.from(objMap.entries())) {
    if (dupes.length > 1) {
      console.log(`Found ${dupes.length} duplicates for Objective: ${title}`);
      const toKeep = dupes[0];
      const toDelete = dupes.slice(1).map(d => d.id);
      console.log(`  Keeping: ${toKeep.id}, Pruning: ${toDelete.join(', ')}`);
      for (const t of toDelete) {
        try {
          await prisma.$executeRawUnsafe(`DELETE FROM objectives WHERE id = '${t}'`);
        } catch (e: unknown) {
          if (e.message.includes('violates foreign key constraint')) {
            await prisma.objectives.update({ where: { id: t }, data: { title: `[ORPHANED] ${title}` } });
          }
        }
      }
    }
  }

  console.log('Cleanup finished.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
