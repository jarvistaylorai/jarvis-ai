import fs from "fs/promises"
import path from "path"
import { exec } from "child_process"
import { getSystemState, updateSystemState } from "../system/state"
import { Agent, Task } from '@contracts';

const WORKSPACE_BASE = "/Users/jarvis/.openclaw/workspace/jarvis"

// Filesystem Tools
async function writeFile({ path: filePath, content }: { path: string; content: string }) {
  const fullPath = path.join(WORKSPACE_BASE, filePath)
  await fs.mkdir(path.dirname(fullPath), { recursive: true })
  await fs.writeFile(fullPath, content, "utf-8")
  return `File written to ${filePath}`
}

async function readFile({ path: filePath }: { path: string }) {
  try {
    const fullPath = path.join(WORKSPACE_BASE, filePath)
    const data = await fs.readFile(fullPath, "utf-8")
    return data
  } catch (error: unknown) {
    return `Error reading file: ${error.message}`
  }
}

async function listDirectory({ path: dirPath }: { path: string }) {
  try {
    const fullPath = path.join(WORKSPACE_BASE, dirPath || "")
    const files = await fs.readdir(fullPath)
    return JSON.stringify(files)
  } catch (error: unknown) {
    return `Error listing directory: ${error.message}`
  }
}

// Task Tools
async function createTask({ title, description }: { title: string; description?: string }) {
  const state = await getSystemState()
  const tasks = state.tasks || []
  const newTask = {
    id: `t_${Date.now()}`,
    title,
    description: description || "",
    status: "in_progress",
    steps: [],
    auto_execute: true
  }
  tasks.push(newTask)
  await updateSystemState("tasks.json", tasks)
  return `Created task ${newTask.id}`
}

async function updateTask({ id, status, steps }: { id: string; status?: string; steps?: string[] }) {
  const state = await getSystemState()
  const tasks = state.tasks || []
  const taskIndex = tasks.findIndex((t: Task) => t.id === id)
  
  if (taskIndex === -1) return `Task ${id} not found`
  
  if (status) tasks[taskIndex].status = status
  if (steps) tasks[taskIndex].steps = steps
  
  await updateSystemState("tasks.json", tasks)
  return `Updated task ${id}`
}

async function assignTask({ taskId, agentId }: { taskId: string; agentId: string }) {
  const state = await getSystemState()
  const tasks = state.tasks || []
  const agents = state.agents || []
  
  const taskIndex = tasks.findIndex((t: Task) => t.id === taskId)
  if (taskIndex === -1) return `Task ${taskId} not found`
  
  const agentIndex = agents.findIndex((a: Agent) => a.id === agentId)
  if (agentIndex === -1) return `Agent ${agentId} not found`
  
  tasks[taskIndex].assigned_agent = agentId
  agents[agentIndex].current_task_id = taskId
  
  await updateSystemState("tasks.json", tasks)
  await updateSystemState("agents.json", agents)
  return `Assigned task ${taskId} to agent ${agentId}`
}

// Terminal Tool
export function runCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
    exec(command, { cwd: WORKSPACE_BASE }, (err, stdout, stderr) => {
      if (err) resolve(`Error: ${err.message}\nStderr: ${stderr}`)
      else resolve(stdout || stderr || "Command executed without output.")
    })
  })
}

export async function executeToolCall(call: Record<string, unknown>, agent: Agent) {
  const { name, arguments: argsString } = call.function
  const args = JSON.parse(argsString)
  
  console.log(`[Agent ${agent.id}] Executing tool ${name}`)

  try {
    switch (name) {
      case "write_file":
        return await writeFile(args)
      case "read_file":
        return await readFile(args)
      case "list_directory":
        return await listDirectory(args)
      case "create_task":
        return await createTask(args)
      case "update_task":
        return await updateTask(args)
      case "assign_task":
        return await assignTask(args)
      case "run_command":
        return await runCommand(args.command)
      default:
        return `Unknown tool ${name}`
    }
  } catch (error: unknown) {
    return `Error executing tool: ${error.message}`
  }
}
