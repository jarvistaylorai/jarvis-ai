import { PrismaClient } from "@prisma/client"
import { getSystemState } from "./state"

const DEFAULT_BOARD_COLUMNS = ["Ideas", "To-Do", "Doing", "Under Review", "Done"]

export async function ensureGlobalLists(prisma: PrismaClient, workspace: string) {
  let lists = await prisma.taskList.findMany({
    where: { workspace, project_id: "global" },
    orderBy: { position: "asc" }
  })

  if (lists.length === 0) {
    lists = await prisma.$transaction(
      DEFAULT_BOARD_COLUMNS.map((name, index) =>
        prisma.taskList.create({
          data: {
            workspace,
            project_id: "global",
            name,
            position: (index + 1) * 1024
          }
        })
      )
    )
  }

  return lists
}

export async function syncJarvisFilesystemToDatabase(prisma: PrismaClient, workspace = "business") {
  const snapshot = await getSystemState()
  const transactions: any[] = []

  const globalLists = await ensureGlobalLists(prisma, workspace)
  const defaultListId = globalLists[0]?.id

  // Projects first so FK references exist
  for (const project of snapshot.projects || []) {
    if (!project?.id || !project?.name) continue
    transactions.push(
      prisma.project.upsert({
        where: { id: project.id },
        create: {
          id: project.id,
          workspace,
          name: project.name,
          description: project.description || null,
          status: (project.status || project.stage || "IDEA").toString().toUpperCase(),
          priority: project.priority || "MEDIUM",
          progress: typeof project.progress === "number" ? project.progress : 0,
          health: project.health || "HEALTHY",
          automation_enabled: project.automation_enabled ?? false,
          auto_assign: project.auto_assign ?? true,
          type: project.type || null,
          system_config: project.system_config || null
        },
        update: {
          description: project.description || null,
          status: (project.status || project.stage || "IDEA").toString().toUpperCase(),
          priority: project.priority || "MEDIUM",
          progress: typeof project.progress === "number" ? project.progress : 0,
          health: project.health || "HEALTHY",
          automation_enabled: project.automation_enabled ?? false,
          auto_assign: project.auto_assign ?? true,
          type: project.type || null,
          system_config: project.system_config || null
        }
      })
    )
  }

  for (const agent of snapshot.agents || []) {
    if (!agent?.id || !agent?.name) continue
    transactions.push(
      prisma.agent.upsert({
        where: { id: agent.id },
        create: {
          id: agent.id,
          workspace,
          name: agent.name,
          role: agent.role || "Agent",
          description: agent.description || null,
          capabilities: JSON.stringify(agent.capabilities || []),
          status: agent.status || "idle",
          load: agent.load || "normal",
          layer: agent.layer || "core",
          current_task: agent.current_task || agent.current_task_id || null,
          last_active_at: agent.last_active ? new Date(agent.last_active) : new Date()
        },
        update: {
          role: agent.role || "Agent",
          description: agent.description || null,
          capabilities: JSON.stringify(agent.capabilities || []),
          status: agent.status || "idle",
          load: agent.load || "normal",
          layer: agent.layer || "core",
          current_task: agent.current_task || agent.current_task_id || null,
          last_active_at: agent.last_active ? new Date(agent.last_active) : new Date()
        }
      })
    )
  }

  let taskPosition = 1024
  for (const task of snapshot.tasks || []) {
    if (!task?.id || !task?.title) continue
    const projectId = task.project_id || task.project || null
    transactions.push(
      prisma.task.upsert({
        where: { id: task.id },
        create: {
          id: task.id,
          workspace,
          title: task.title,
          description: task.description || null,
          status: task.status || "pending",
          priority: task.priority || "normal",
          project_id: projectId,
          list_id: task.list_id || defaultListId,
          assigned_agent: task.assigned_agent || null,
          assigned_to: task.assigned_to || null,
          position: task.position || taskPosition,
          dependencies: JSON.stringify(task.dependencies || []),
          created_at: task.created_at || new Date().toISOString()
        },
        update: {
          title: task.title,
          description: task.description || null,
          status: task.status || "pending",
          priority: task.priority || "normal",
          project_id: projectId,
          list_id: task.list_id || defaultListId,
          assigned_agent: task.assigned_agent || null,
          assigned_to: task.assigned_to || null,
          position: task.position || taskPosition,
          dependencies: JSON.stringify(task.dependencies || []),
          created_at: task.created_at || new Date().toISOString()
        }
      })
    )
    taskPosition += 1024
  }

  const objectiveLinks = snapshot.objective_links || []

  for (const objective of snapshot.objectives || []) {
    if (!objective?.id || !objective?.title) continue
    const matchedLink = objectiveLinks.find((link: any) => link.objective_id === objective.id && link.entity_type === "project")
    transactions.push(
      prisma.objective.upsert({
        where: { id: objective.id },
        create: {
          id: objective.id,
          workspace,
          title: objective.title,
          description: objective.description || null,
          status: objective.status || "ACTIVE",
          priority: objective.priority || "MEDIUM",
          progress: typeof objective.progress === "number" ? objective.progress : 0,
          project_id: matchedLink?.entity_id || null
        },
        update: {
          title: objective.title,
          description: objective.description || null,
          status: objective.status || "ACTIVE",
          priority: objective.priority || "MEDIUM",
          progress: typeof objective.progress === "number" ? objective.progress : 0,
          project_id: matchedLink?.entity_id || null
        }
      })
    )
  }

  for (const alert of snapshot.alerts || []) {
    if (!alert?.id || !alert?.message) continue
    transactions.push(
      prisma.alert.upsert({
        where: { id: alert.id },
        create: {
          id: alert.id,
          workspace,
          type: alert.type || "SYSTEM",
          message: alert.message,
          severity: alert.severity || "LOW",
          status: alert.status || "ACTIVE",
          created_at: alert.created_at || new Date().toISOString()
        },
        update: {
          type: alert.type || "SYSTEM",
          message: alert.message,
          severity: alert.severity || "LOW",
          status: alert.status || "ACTIVE",
          created_at: alert.created_at || new Date().toISOString()
        }
      })
    )
  }

  for (const rule of snapshot.automation_rules || []) {
    if (!rule?.id || !rule?.action) continue
    transactions.push(
      prisma.automationRule.upsert({
        where: { id: rule.id },
        create: {
          id: rule.id,
          workspace,
          trigger: rule.trigger || "",
          condition: rule.condition || null,
          action: rule.action,
          enabled: rule.enabled ?? true
        },
        update: {
          trigger: rule.trigger || "",
          condition: rule.condition || null,
          action: rule.action,
          enabled: rule.enabled ?? true
        }
      })
    )
  }

  for (const memory of snapshot.agent_memory || []) {
    if (!memory?.id || !memory?.agent_id) continue
    transactions.push(
      prisma.agentMemory.upsert({
        where: { id: memory.id },
        create: {
          id: memory.id,
          workspace,
          agent_id: memory.agent_id,
          memory_type: memory.memory_type || "TASK_CONTEXT",
          content: memory.content || "",
          created_at: memory.created_at || new Date().toISOString()
        },
        update: {
          agent_id: memory.agent_id,
          memory_type: memory.memory_type || "TASK_CONTEXT",
          content: memory.content || "",
          created_at: memory.created_at || new Date().toISOString()
        }
      })
    )
  }

  for (const activity of snapshot.activity || []) {
    if (!activity?.id || !activity?.agent_id) continue
    transactions.push(
      prisma.activity.upsert({
        where: { id: activity.id },
        create: {
          id: activity.id,
          workspace,
          agent_id: activity.agent_id,
          message: activity.message || activity.task || "",
          status: activity.status || "running",
          timestamp: activity.timestamp || new Date().toISOString()
        },
        update: {
          agent_id: activity.agent_id,
          message: activity.message || activity.task || "",
          status: activity.status || "running",
          timestamp: activity.timestamp || new Date().toISOString()
        }
      })
    )
  }

  if (snapshot.system_state) {
    transactions.push(
      prisma.systemState.upsert({
        where: { id: snapshot.system_state.id || "global" },
        create: {
          id: snapshot.system_state.id || "global",
          workspace,
          status: snapshot.system_state.status || "NORMAL",
          active_agents: snapshot.system_state.active_agents ?? 0,
          pending_tasks: snapshot.system_state.pending_tasks ?? 0,
          blocked_tasks: snapshot.system_state.blocked_tasks ?? 0,
          last_evaluated_at: snapshot.system_state.last_evaluated_at || new Date().toISOString()
        },
        update: {
          status: snapshot.system_state.status || "NORMAL",
          active_agents: snapshot.system_state.active_agents ?? 0,
          pending_tasks: snapshot.system_state.pending_tasks ?? 0,
          blocked_tasks: snapshot.system_state.blocked_tasks ?? 0,
          last_evaluated_at: snapshot.system_state.last_evaluated_at || new Date().toISOString()
        }
      })
    )
  }

  if (transactions.length > 0) {
    await prisma.$transaction(transactions)
  }

  return snapshot
}

