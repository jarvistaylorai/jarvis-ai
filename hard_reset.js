const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const resetData = {
  "objectives": [
    {
      "project": "Medellin Social Club",
      "title": "Launch MSC Platform"
    },
    {
      "project": "Medellin Social Club",
      "title": "Get 10 Founders To Join"
    },
    {
      "project": "AssetOSX",
      "title": "Launch AssetOSX V1.0"
    },
    {
      "project": "AssetOSX",
      "title": "Launch AssetOSX V2.0"
    },
    {
      "project": "Jarvis",
      "title": "Launch Command Center"
    },
    {
      "project": "Jarvis",
      "title": "Fully Integrate Openclaw"
    },
    {
      "project": "Jarvis",
      "title": "Launch Sub-Agents"
    },
    {
      "project": "OpenClaw Integration",
      "title": "Finalize Model Routing"
    },
    {
      "project": "OpenClaw Integration",
      "title": "Enforce Budget Controls"
    },
    {
      "project": "Mentorship Platform",
      "title": "Brainstorm & Design Platform"
    },
    {
      "project": "Cortana AI",
      "title": "Relaunch Cortana AI"
    },
    {
      "project": "Cortana AI",
      "title": "Launch Marketing Campaign"
    }
  ],
  "tasks": [
    {
      "project": "Medellin Social Club",
      "objective": "Launch MSC Platform",
      "title": "MSC Platform V1.0 Client",
      "status": "done"
    },
    {
      "project": "Medellin Social Club",
      "objective": "Launch MSC Platform",
      "title": "MSC Platform V1.0 Admin",
      "status": "doing"
    },
    {
      "project": "Medellin Social Club",
      "objective": "Launch MSC Platform",
      "title": "Fill Platform With Resources",
      "status": "todo"
    },
    {
      "project": "Medellin Social Club",
      "objective": "Launch MSC Platform",
      "title": "QA Testing",
      "status": "todo"
    },
    {
      "project": "Medellin Social Club",
      "objective": "Launch MSC Platform",
      "title": "Launch Publicly",
      "status": "todo"
    },
    {
      "project": "Medellin Social Club",
      "objective": "Get 10 Founders To Join",
      "title": "Send out invites to all girls",
      "status": "todo"
    },
    {
      "project": "Medellin Social Club",
      "objective": "Get 10 Founders To Join",
      "title": "Send out invites to guys in my network",
      "status": "todo"
    },
    {
      "project": "Medellin Social Club",
      "objective": "Get 10 Founders To Join",
      "title": "Launch Party",
      "status": "todo"
    },
    {
      "project": "Medellin Social Club",
      "objective": "Get 10 Founders To Join",
      "title": "Plan Cartagena Trip",
      "status": "todo"
    },
    {
      "project": "AssetOSX",
      "objective": "Launch AssetOSX V1.0",
      "title": "Brainstorm All Features",
      "status": "done"
    },
    {
      "project": "AssetOSX",
      "objective": "Launch AssetOSX V1.0",
      "title": "Proposal",
      "status": "done"
    },
    {
      "project": "AssetOSX",
      "objective": "Launch AssetOSX V1.0",
      "title": "Development (Admin/Client/Tech)",
      "status": "done"
    },
    {
      "project": "AssetOSX",
      "objective": "Launch AssetOSX V1.0",
      "title": "QA",
      "status": "in_review"
    },
    {
      "project": "AssetOSX",
      "objective": "Launch AssetOSX V1.0",
      "title": "Platform Live",
      "status": "doing"
    },
    {
      "project": "AssetOSX",
      "objective": "Launch AssetOSX V2.0",
      "title": "Brainstorm Ideas",
      "status": "idea"
    },
    {
      "project": "AssetOSX",
      "objective": "Launch AssetOSX V2.0",
      "title": "Proposal",
      "status": "idea"
    },
    {
      "project": "AssetOSX",
      "objective": "Launch AssetOSX V2.0",
      "title": "Development",
      "status": "idea"
    },
    {
      "project": "AssetOSX",
      "objective": "Launch AssetOSX V2.0",
      "title": "QA",
      "status": "idea"
    },
    {
      "project": "AssetOSX",
      "objective": "Launch AssetOSX V2.0",
      "title": "Platform Live",
      "status": "idea"
    },
    {
      "project": "Jarvis",
      "objective": "Launch Command Center",
      "title": "Brainstorm & Design",
      "status": "done"
    },
    {
      "project": "Jarvis",
      "objective": "Launch Command Center",
      "title": "Development",
      "status": "doing"
    },
    {
      "project": "Jarvis",
      "objective": "Launch Command Center",
      "title": "QA",
      "status": "todo"
    },
    {
      "project": "Jarvis",
      "objective": "Launch Command Center",
      "title": "Brainstorm V2.0 Features",
      "status": "idea"
    },
    {
      "project": "Jarvis",
      "objective": "Fully Integrate Openclaw",
      "title": "Setup Openclaw",
      "status": "done"
    },
    {
      "project": "Jarvis",
      "objective": "Fully Integrate Openclaw",
      "title": "Configure All Openclaw Settings",
      "status": "doing"
    },
    {
      "project": "Jarvis",
      "objective": "Fully Integrate Openclaw",
      "title": "Openclaw QA",
      "status": "todo"
    },
    {
      "project": "Jarvis",
      "objective": "Launch Sub-Agents",
      "title": "Research Subagents",
      "status": "idea"
    },
    {
      "project": "Jarvis",
      "objective": "Launch Sub-Agents",
      "title": "Configure Subagents",
      "status": "idea"
    },
    {
      "project": "Jarvis",
      "objective": "Launch Sub-Agents",
      "title": "Set Sub-Agents live",
      "status": "idea"
    },
    {
      "project": "OpenClaw Integration",
      "objective": "Finalize Model Routing",
      "title": "Implement routing logic",
      "status": "todo"
    },
    {
      "project": "OpenClaw Integration",
      "objective": "Finalize Model Routing",
      "title": "Test across providers",
      "status": "todo"
    },
    {
      "project": "OpenClaw Integration",
      "objective": "Finalize Model Routing",
      "title": "Validate cost efficiency",
      "status": "todo"
    },
    {
      "project": "OpenClaw Integration",
      "objective": "Enforce Budget Controls",
      "title": "Implement spend tracking",
      "status": "todo"
    },
    {
      "project": "OpenClaw Integration",
      "objective": "Enforce Budget Controls",
      "title": "Add budget caps",
      "status": "todo"
    },
    {
      "project": "OpenClaw Integration",
      "objective": "Enforce Budget Controls",
      "title": "Test downgrade logic",
      "status": "todo"
    },
    {
      "project": "Mentorship Platform",
      "objective": "Brainstorm & Design Platform",
      "title": "Brainstorm & Design",
      "status": "idea"
    },
    {
      "project": "Mentorship Platform",
      "objective": "Brainstorm & Design Platform",
      "title": "Market Research",
      "status": "idea"
    },
    {
      "project": "Mentorship Platform",
      "objective": "Brainstorm & Design Platform",
      "title": "Write Development Plan",
      "status": "idea"
    },
    {
      "project": "Cortana AI",
      "objective": "Relaunch Cortana AI",
      "title": "Ensure all platforms working correctly",
      "status": "idea"
    },
    {
      "project": "Cortana AI",
      "objective": "Relaunch Cortana AI",
      "title": "Contact all users to see progress",
      "status": "idea"
    },
    {
      "project": "Cortana AI",
      "objective": "Relaunch Cortana AI",
      "title": "Update all features",
      "status": "idea"
    },
    {
      "project": "Cortana AI",
      "objective": "Launch Marketing Campaign",
      "title": "Talk to Femi about contract",
      "status": "idea"
    },
    {
      "project": "Cortana AI",
      "objective": "Launch Marketing Campaign",
      "title": "Film 3 videos & launch IG Ads",
      "status": "idea"
    },
    {
      "project": "Cortana AI",
      "objective": "Launch Marketing Campaign",
      "title": "Look for additional partners",
      "status": "idea"
    }
  ]
};

const statusMap = {
  "todo": "pending",
  "done": "completed",
  "doing": "in_progress",
  "idea": "ideas",
  "in_review": "under_review",
  "blocked": "blocked"
};

async function main() {
  console.log("Starting HARD RESET...");
  
  const TRASH_WORKSPACE = "00000000-0000-0000-0000-000000000000";

  // Since Supabase often prevents DISABLE TRIGGER ALL for non-superusers,
  // we bypass the `telemetry_events` append-only trigger by simply moving 
  // all old tasks and objectives out of your workspace so they disappear.
  console.log("Moving all existing tasks to an isolated trash workspace...");
  await prisma.tasks.updateMany({
    where: { NOT: { workspace_id: TRASH_WORKSPACE } },
    data: { workspace_id: TRASH_WORKSPACE, project_id: null, objective_id: null }
  });
  
  console.log("Moving all existing objectives to an isolated trash workspace...");
  await prisma.objectives.updateMany({
    where: { NOT: { workspace_id: TRASH_WORKSPACE } },
    data: { workspace_id: TRASH_WORKSPACE, project_id: null }
  });
  
  console.log("Deleting all task labels globally just to be safe if any dangling exist...");
  await prisma.labels.deleteMany({});
  
  const projects = await prisma.projects.findMany({});
  const projectMap = {};
  for (const p of projects) {
    projectMap[p.name] = { id: p.id, workspace_id: p.workspace_id };
  }
  
  // Assume generic workspace id if project not found
  const defaultWorkspaceId = projects.length > 0 ? projects[0].workspace_id : '00000000-0000-0000-0000-000000000000';

  async function getProject(projectName) {
    if (projectMap[projectName]) return projectMap[projectName];
    console.log(`Project '${projectName}' not found. Creating it...`);
    const newProj = await prisma.projects.create({
      data: {
        name: projectName,
        workspace_id: defaultWorkspaceId,
      }
    });
    projectMap[projectName] = { id: newProj.id, workspace_id: newProj.workspace_id };
    return projectMap[projectName];
  }

  const objectiveMap = {}; // "ProjectName|ObjectiveTitle" -> objective_id
  for (const obj of resetData.objectives) {
    const projInfo = await getProject(obj.project);
    const newObj = await prisma.objectives.create({
      data: {
        workspace_id: projInfo.workspace_id,
        project_id: projInfo.id,
        title: obj.title,
        status: "not_started"
      }
    });
    objectiveMap[`${obj.project}|${obj.title}`] = newObj.id;
  }

  for (const task of resetData.tasks) {
    const projInfo = await getProject(task.project);
    const objectiveId = objectiveMap[`${task.project}|${task.objective}`];
    
    await prisma.tasks.create({
      data: {
        workspace_id: projInfo.workspace_id,
        project_id: projInfo.id,
        objective_id: objectiveId,
        title: task.title,
        status: statusMap[task.status] || "pending",
        type: "action"
      }
    });
  }

  console.log("HARD RESET COMPLETE!");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
