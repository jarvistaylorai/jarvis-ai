import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspace = searchParams.get('workspace') || 'business';

    // 1. Read State from DB
    const [
      tasks,
      agents,
      alerts,
      systemStateArr,
      automationRules
    ] = await Promise.all([
      prisma.task.findMany({ where: { workspace } }),
      prisma.agent.findMany({ where: { workspace } }),
      prisma.alert.findMany(),
      prisma.systemState.findMany(),
      prisma.automationRule.findMany({ where: { workspace } })
    ]);

    const systemState = systemStateArr[0] || { id: 'global', status: 'NORMAL', active_agents: 0, pending_tasks: 0, blocked_tasks: 0, last_evaluated_at: new Date().toISOString() };
    
    let stateMutated = false;
    const taskUpdates: any[] = [];
    const alertCreates: any[] = [];
    const memoryCreates: any[] = [];

    // Parse dependencies since they are strings in SQLite
    const parsedTasks = tasks.map((t: any) => ({
      ...t,
      dependencies_array: JSON.parse(t.dependencies || '[]')
    }));

    // 2. Alerting & Bottlenecks (Task Dependencies)
    parsedTasks.forEach((task: any) => {
      if (task.status !== 'completed' && task.dependencies_array && task.dependencies_array.length > 0) {
        const depsCompleted = task.dependencies_array.every(
          (depId: string) => parsedTasks.find((t: any) => t.id === depId)?.status === 'completed'
        );
        const isBlocked = !depsCompleted;
        
        if (isBlocked && task.status !== 'blocked') {
          task.status = 'blocked';
          taskUpdates.push(prisma.task.update({ where: { id: task.id }, data: { status: 'blocked' } }));
          stateMutated = true;
          
          // Generate Alert
          if (!alerts.find((a: any) => a.message.includes(task.id) && a.status === 'ACTIVE')) {
            alertCreates.push(prisma.alert.create({
              data: {
                id: 'alert_' + generateId(),
                type: 'BLOCKED_TASK',
                message: `Task ${task.title} (ID: ${task.id}) is blocked by dependencies.`,
                severity: 'HIGH',
                status: 'ACTIVE',
                created_at: new Date().toISOString()
              }
            }));
          }
        } else if (!isBlocked && task.status === 'blocked') {
          task.status = 'pending';
          taskUpdates.push(prisma.task.update({ where: { id: task.id }, data: { status: 'pending' } }));
          stateMutated = true;
        }
      }
    });

    // 3. Automation Engine (Simplified Parser)
    automationRules.forEach((rule: any) => {
      if (!rule.enabled) return;
      
      if (rule.trigger.includes("task.priority == 'critical'") && rule.condition?.includes("task.status == 'pending'")) {
        const matchAction = rule.action.match(/assign_agent\('([^']+)'\)/);
        if (matchAction) {
          const agentName = matchAction[1];
          parsedTasks.forEach((t: any) => {
            if (t.priority === 'critical' && t.status === 'pending') {
              t.assigned_agent = agentName;
              taskUpdates.push(prisma.task.update({ where: { id: t.id }, data: { assigned_agent: agentName } }));
              stateMutated = true;
            }
          });
        }
      }
      
      if (rule.trigger.includes("system.status == 'BLOCKED'")) {
        if (systemState.status === 'BLOCKED') {
          if (!alerts.find((a: any) => a.message === 'System Execution Blocked' && a.status === 'ACTIVE')) {
            alertCreates.push(prisma.alert.create({
              data: {
                id: 'alert_' + generateId(),
                type: 'SYSTEM_OVERLOAD',
                message: 'System Execution Blocked',
                severity: 'CRITICAL',
                status: 'ACTIVE',
                created_at: new Date().toISOString()
              }
            }));
            stateMutated = true;
          }
        }
      }
    });

    // 4. Autonomous Task Routing
    const agentUpdates: any[] = [];
    const availableAgents = agents.filter((a: any) => a.status === 'active' || a.status === 'idle');
    if (availableAgents.length > 0) {
      let agentIndex = 0;
      parsedTasks.forEach((task: any) => {
        if (task.status === 'pending' && (!task.assigned_agent || task.assigned_agent === 'Unassigned')) {
          const selectedAgent = availableAgents[agentIndex % availableAgents.length];
          task.assigned_agent = selectedAgent.name;
          task.status = 'in-progress';
          
          taskUpdates.push(prisma.task.update({
             where: { id: task.id },
             data: { assigned_agent: selectedAgent.name, status: 'in-progress' }
          }));

          agentUpdates.push(prisma.agent.update({
             where: { id: selectedAgent.id },
             data: { current_task: task.title, status: 'active' }
          }));

          agentIndex++;
          stateMutated = true;
          
          memoryCreates.push(prisma.agentMemory.create({
             data: {
                id: 'mem_' + generateId(),
                workspace,
                agent_id: selectedAgent.id,
                memory_type: 'TASK_CONTEXT',
                content: `Assigned and commenced work on task: ${task.title}`,
                created_at: new Date().toISOString()
             }
          }));

          if (task.project_id) {
            memoryCreates.push(prisma.projectActivity.create({
               data: {
                  project_id: task.project_id,
                  message: `Agent ${selectedAgent.name} assigned to work on task "${task.title}".`
               }
            }));
          }
        }
      });
    }

    // 5. System State Engine
    const blockedTasksCount = parsedTasks.filter((t: any) => t.status === 'blocked').length;
    const pendingTasksCount = parsedTasks.filter((t: any) => t.status === 'pending').length;
    const inProgressCount = parsedTasks.filter((t: any) => t.status === 'in-progress').length;
    const activeAgentsCount = agents.filter((a: any) => a.status === 'active').length;
    
    let newStatus = 'NORMAL';
    if (blockedTasksCount > 0) newStatus = 'BLOCKED';
    else if (pendingTasksCount > 2 && activeAgentsCount < 2) newStatus = 'OVERLOADED';
    else if (pendingTasksCount === 0 && inProgressCount === 0 && activeAgentsCount === 0) newStatus = 'IDLE';

    let systemStatePromise = null;
    if (systemState.status !== newStatus || systemState.blocked_tasks !== blockedTasksCount || systemState.pending_tasks !== pendingTasksCount) {
       systemStatePromise = prisma.systemState.upsert({
          where: { id: systemState.id },
          create: {
             id: 'global',
             status: newStatus,
             blocked_tasks: blockedTasksCount,
             pending_tasks: pendingTasksCount,
             active_agents: activeAgentsCount,
             last_evaluated_at: new Date().toISOString()
          },
          update: {
             status: newStatus,
             blocked_tasks: blockedTasksCount,
             pending_tasks: pendingTasksCount,
             active_agents: activeAgentsCount,
             last_evaluated_at: new Date().toISOString()
          }
       });
       stateMutated = true;
    }

    // 6. Execute all PRISMA mutations batched
    if (stateMutated) {
       const transactions = [
          ...taskUpdates,
          ...alertCreates,
          ...agentUpdates,
          ...memoryCreates
       ];
       if (systemStatePromise) transactions.push(systemStatePromise);

       await prisma.$transaction(transactions);
    }

    return NextResponse.json({ success: true, mutated: stateMutated, status: newStatus });
  } catch (err: any) {
    console.error("API Error [POST /api/engine]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
