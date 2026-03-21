import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export async function POST(req: Request) {
  try {
    const { command } = await req.json();
    if (!command) return NextResponse.json({ success: false, error: 'No command provided' }, { status: 400 });

    const cmd = command.toLowerCase();
    let actions_executed: string[] = [];
    let warnings: string[] = [];
    let mutations: any[] = [];

    const tasks = await prisma.task.findMany();
    const agents = await prisma.agent.findMany();
    const projects = await prisma.project.findMany();

    // Command: "Assign all high priority tasks to Dev Agent"
    if (cmd.includes('assign') && (cmd.includes('high priority') || cmd.includes('critical'))) {
      const matchAgent = /to (.+?)$/.exec(cmd);
      const agentTarget = matchAgent ? matchAgent[1].trim() : 'Jarvis';
      
      let assignedCount = 0;
      tasks.forEach((t: any) => {
        if ((t.priority === 'high' || t.priority === 'critical') && t.status === 'pending') {
          mutations.push(prisma.task.update({ where: { id: t.id }, data: { assigned_agent: agentTarget, status: 'in-progress' } }));
          assignedCount++;
        }
      });
      
      if (assignedCount > 0) {
        actions_executed.push(`Assigned ${assignedCount} high-priority tasks to ${agentTarget}.`);
        mutations.push(prisma.agentMemory.create({
          data: {
            id: 'mem_' + generateId(),
            agent_id: agentTarget,
            memory_type: 'TASK_CONTEXT',
            content: `Assigned ${assignedCount} tasks via natural language command.`,
            created_at: new Date().toISOString()
          }
        }));
      } else {
        warnings.push('No unassigned high-priority tasks found.');
      }
    }

    // Command: "Start <Project Name> sprint" or "Start project"
    else if (cmd.includes('start') && (cmd.includes('sprint') || cmd.includes('project'))) {
      const targetProj = projects.find((p: any) => cmd.includes(p.name.toLowerCase()));
      if (targetProj) {
        if (targetProj.status !== 'BUILD') {
          mutations.push(prisma.project.update({ where: { id: targetProj.id }, data: { status: 'BUILD' } }));
          actions_executed.push(`Started development sprint for project: ${targetProj.name}.`);
        } else {
          warnings.push(`Project ${targetProj.name} is already in development.`);
        }
      } else {
        warnings.push('Could not identify a matching project from the command.');
      }
    }

    // Command: "Create task <title>"
    else if (cmd.startsWith('create task')) {
      const title = command.replace(/create task/i, '').trim();
      if (title.length > 0) {
        // Automatically link to first project if available
        const defaultProject = projects[0];
        const projectId = defaultProject ? defaultProject.id : null;
        const taskId = 't_' + generateId();

        // Auto Assign (HOOK)
        let assignedAgent = 'Unassigned';
        let assignedAgentId = null;
        let finalStatus = 'pending';
        
        if (defaultProject && defaultProject.auto_assign) {
           const activeAgents = agents.filter((a: any) => a.status === 'active' || a.status === 'idle');
           if (activeAgents.length > 0) {
             // Find least loaded agent (simplistic logic: randomly select, or ideally check who has fewest tasks)
             // We will check tasks allocated to each agent
             const agentLoads = activeAgents.map((a: any) => ({
                 agent: a,
                 load: tasks.filter((t: any) => t.assigned_agent === a.name && (t.status === 'pending' || t.status === 'in-progress')).length
             }));
             agentLoads.sort((a: any, b: any) => a.load - b.load);
             const leastLoaded = agentLoads[0]?.agent;
             if (leastLoaded) {
                assignedAgent = leastLoaded.name;
                assignedAgentId = leastLoaded.id;
                finalStatus = 'in-progress';
             }
           }
        }

        mutations.push(prisma.task.create({
          data: {
            id: taskId,
            title: title,
            status: finalStatus,
            priority: 'normal',
            project_id: projectId,
            assigned_agent: assignedAgent,
            dependencies: "[]",
            created_at: new Date().toISOString()
          }
        }));

        if (projectId) {
           mutations.push(prisma.projectActivity.create({
             data: {
               project_id: projectId,
               message: `Task created: "${title}"`
             }
           }));

           if (assignedAgent !== 'Unassigned') {
             mutations.push(prisma.projectActivity.create({
               data: {
                 project_id: projectId,
                 message: `Agent ${assignedAgent} assigned to task "${title}" automatically.`
               }
             }));
             mutations.push(prisma.agent.update({
               where: { id: assignedAgentId },
               data: { current_task: title, status: 'active' }
             }));
           }
        }

        actions_executed.push(`Created new task: "${title}".`);
      } else {
        warnings.push('Task title missing.');
      }
    }

    // Command: "Halt execution" or "Stop all agents"
    else if (cmd.includes('halt') || cmd.includes('stop all')) {
      agents.forEach((a: any) => {
        if (a.status === 'active') {
          mutations.push(prisma.agent.update({ where: { id: a.id }, data: { status: 'idle', current_task: '' } }));
        }
      });
      actions_executed.push('Halted all active agent execution streams.');
    }

    // Falsy matching fallback
    else {
      warnings.push(`Command "${command}" not recognized by natural language parser model.`);
    }

    if (mutations.length > 0) {
      await prisma.$transaction(mutations);
    }

    return NextResponse.json({
      success: actions_executed.length > 0,
      actions_executed,
      warnings
    });

  } catch (error: any) {
    console.error("API Error [POST /api/command/execute]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
