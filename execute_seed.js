const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function main() {
  console.log("Loading seed data...");
  const seedData = JSON.parse(fs.readFileSync('execution_system_seed.json', 'utf8'));

  // Map to hold oldStringID -> newUUID
  const idMap = {};
  const getUuid = (oldId) => {
      if(!oldId) return null;
      if(!idMap[oldId]) {
          idMap[oldId] = crypto.randomUUID();
      }
      return idMap[oldId];
  };

  // 1. Get Workspace ID from existing db, or generate one
  let workspace_id;
  const existingProject = await prisma.projects.findFirst();
  if (existingProject && existingProject.workspace_id) {
    workspace_id = existingProject.workspace_id;
  } else {
    const existingTask = await prisma.tasks.findFirst();
    if(existingTask && existingTask.workspace_id) {
        workspace_id = existingTask.workspace_id;
    } else {
        workspace_id = crypto.randomUUID();
    }
  }
  console.log(`Using Workspace ID: ${workspace_id}`);

  // 2. Remove any legacy Mission Control projects and all associated tasks/objectives
  const missionControlProjects = await prisma.projects.findMany({
    where: { name: { contains: 'Mission Control', mode: 'insensitive' } }
  });
  
  for (const mc of missionControlProjects) {
    console.log(`Removing legacy Mission Control project: ${mc.id} - ${mc.name}`);
    await prisma.projects.delete({ where: { id: mc.id } });
  }

  // 3. Insert Projects
  console.log("Inserting Projects...");
  for (const p of seedData.projects) {
     const newId = getUuid(p.id);
     await prisma.projects.create({
        data: {
            id: newId,
            workspace_id,
            name: p.title,
            description: p.description,
            status: 'planned'
        }
     });
     console.log(` - Created project: ${p.title} (${newId})`);
  }

  // 4. Insert Objectives
  console.log("Inserting Objectives...");
  for (const o of seedData.objectives) {
     const newId = getUuid(o.id);
     await prisma.objectives.create({
        data: {
            id: newId,
            workspace_id,
            project_id: getUuid(o.project_id),
            title: o.title,
            description: o.description,
            status: 'not_started',
            target_date: o.target_date ? new Date(o.target_date) : null
        }
     });
  }
  console.log(` -> Created ${seedData.objectives.length} objectives.`);

  // 5. Insert Tasks
  console.log("Inserting Tasks & Checklists...");
  let taskCount = 0;
  for (const t of seedData.tasks) {
     const newId = getUuid(t.id);
     
     await prisma.tasks.create({
        data: {
            id: newId,
            workspace_id,
            project_id: getUuid(t.project_id),
            objective_id: getUuid(t.objective_id),
            title: t.title,
            description: t.description,
            status: 'pending',
            due_at: t.due_date ? new Date(t.due_date) : null
        }
     });

     // Insert Checklists
     if (t.checklist && t.checklist.length > 0) {
        const checklistId = crypto.randomUUID();
        await prisma.task_checklists.create({
            data: { id: checklistId, task_id: newId, title: "Execution Steps" }
        });

        const items = t.checklist.map((c, idx) => ({
            id: crypto.randomUUID(),
            checklist_id: checklistId,
            content: c.trim(),
            position: idx
        }));
        
        await prisma.task_checklist_items.createMany({
            data: items
        });
     }
     taskCount++;
  }
  console.log(` -> Created ${taskCount} tasks and all associated checklist items.`);
  console.log("✅ SEED EXECUTION COMPLETE");
}

main()
  .catch((e) => {
    console.error("❌ ERROR DURING DB SEED:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
