import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getWorkspaceId } from '@/lib/workspace-utils';
import { v4 as uuidv4 } from 'uuid';
import { Agent, Task, Project, Alert, TelemetryEvent } from '@/types/contracts';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceStr = searchParams.get('workspace') || 'business';
    const workspaceId = getWorkspaceId(workspaceStr);

    // 1. Read State from DB
    const [
      tasks,
      agents,
      alerts
    ] = await Promise.all([
      prisma.tasks.findMany({ where: { workspace_id: workspaceId } }),
      prisma.agents.findMany({ where: { workspace_id: workspaceId } }),
      prisma.alerts.findMany({ where: { workspace_id: workspaceId } })
    ]);

    let stateMutated = false;
    const taskUpdates: unknown[] = [];
    const alertCreates: unknown[] = [];
    const telemetryCreates: unknown[] = [];
    const agentUpdates: unknown[] = [];

    // 2. Alerting & Bottlenecks (Task Dependencies)
    tasks.forEach((task: Task) => {
      if (task.status !== 'completed' && task.dependency_ids && task.dependency_ids.length > 0) {
        const depsCompleted = task.dependency_ids.every(
          (depId: string) => tasks.find((t: Task) => t.id === depId)?.status === 'completed'
        );
        const isBlocked = !depsCompleted;
        
        if (isBlocked && task.status !== 'blocked') {
          task.status = 'blocked';
          taskUpdates.push(prisma.tasks.update({ where: { id: task.id }, data: { status: 'blocked' } }));
          stateMutated = true;
          
          if (!alerts.find((a: Agent) => a.message.includes(task.id) && a.status === 'active')) {
            alertCreates.push(prisma.alerts.create({
              data: {
                id: uuidv4(),
                workspace_id: workspaceId,
                source_type: 'engine',
                source_id: task.id,
                message: `Task ${task.title} (ID: ${task.id}) is blocked by dependencies.`,
                severity: 'critical',
                status: 'active'
              }
            }));
          }
        } else if (!isBlocked && task.status === 'blocked') {
          task.status = 'pending';
          taskUpdates.push(prisma.tasks.update({ where: { id: task.id }, data: { status: 'pending' } }));
          stateMutated = true;
        }
      }
    });

    // 3. Autonomous Task Routing (Disabled as per user request)
    /*
    const availableAgents = agents.filter((a: Agent) => a.status === 'active' || a.status === 'idle');
    if (availableAgents.length > 0) {
      let agentIndex = 0;
      tasks.forEach((task: Task) => {
        if (task.status === 'pending' && !task.assigned_agent_id) {
          const selectedAgent = availableAgents[agentIndex % availableAgents.length];
          task.assigned_agent_id = selectedAgent.id;
          task.status = 'in_progress';
          
          taskUpdates.push(prisma.tasks.update({
             where: { id: task.id },
             data: { assigned_agent_id: selectedAgent.id, status: 'in_progress' }
          }));

          agentUpdates.push(prisma.agents.update({
             where: { id: selectedAgent.id },
             data: { current_task_id: task.id, status: 'active' }
          }));

          agentIndex++;
          stateMutated = true;
          
          telemetryCreates.push(prisma.telemetry_events.create({
             data: {
                id: uuidv4(),
                workspace_id: workspaceId,
                agent_id: selectedAgent.id,
                task_id: task.id,
                project_id: task.project_id,
                category: 'event',
                severity: 'info',
                event_type: 'task_assigned',
                message: `Agent ${selectedAgent.name} assigned to work on task "${task.title}".`
             }
          }));
        }
      });
    }
    */

    // 5. System State Engine
    const blockedTasksCount = tasks.filter((t: Task) => t.status === 'blocked').length;
    const pendingTasksCount = tasks.filter((t: Task) => t.status === 'pending').length;
    const inProgressCount = tasks.filter((t: Task) => t.status === 'in_progress').length;
    const activeAgentsCount = agents.filter((a: Agent) => a.status === 'active').length;
    
    let newStatus = 'NORMAL';
    if (blockedTasksCount > 0) newStatus = 'BLOCKED';
    else if (pendingTasksCount > 2 && activeAgentsCount < 2) newStatus = 'OVERLOADED';
    else if (pendingTasksCount === 0 && inProgressCount === 0 && activeAgentsCount === 0) newStatus = 'IDLE';

    if (stateMutated) {
       await prisma.$transaction([
          ...taskUpdates,
          ...alertCreates,
          ...agentUpdates,
          ...telemetryCreates
       ]);
    }

    return NextResponse.json({ success: true, mutated: stateMutated, status: newStatus });
  } catch (err: unknown) {
    console.error("API Error [POST /api/engine]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
