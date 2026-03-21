import fs from "fs/promises"
import path from "path"

const DEFAULT_BASE = path.join(process.env.HOME ?? "", ".openclaw", "workspace", "jarvis", "system")
const STATE_BASE = process.env.JARVIS_STATE_DIR || DEFAULT_BASE

const FILE_MAP = {
  agents: "agents.json",
  tasks: "tasks.json",
  activity: "activity.json",
  projects: "projects.json",
  objectives: "objectives.json",
  objective_links: "objective_links.json",
  alerts: "alerts.json",
  automation_rules: "automation_rules.json",
  agent_memory: "agent_memory.json",
  messages: "messages.json",
  system_state: "system_state.json",
  global_lists: "global_lists.json"
} as const

export type JarvisState = {
  agents: any[]
  tasks: any[]
  activity: any[]
  projects: any[]
  objectives: any[]
  objective_links: any[]
  alerts: any[]
  automation_rules: any[]
  agent_memory: any[]
  messages: any[]
  system_state: any | null
  global_lists: any[]
}

async function ensureBaseDir() {
  await fs.mkdir(STATE_BASE, { recursive: true })
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const data = await fs.readFile(path.join(STATE_BASE, file), "utf-8")
    return JSON.parse(data) as T
  } catch (error: any) {
    if (error?.code === "ENOENT") return fallback
    console.error(`Error reading ${file}:`, error)
    return fallback
  }
}

export async function getSystemState(): Promise<JarvisState> {
  await ensureBaseDir()
  const entries = await Promise.all(
    Object.entries(FILE_MAP).map(async ([key, file]) => {
      const fallback = key === "system_state" ? null : []
      const value = await readJson(file, fallback)
      return [key, value]
    })
  )

  return Object.fromEntries(entries) as JarvisState
}

export async function writeSystemSnapshot(partial: Partial<JarvisState>) {
  await ensureBaseDir()
  const tasks = Object.entries(partial).map(([key, value]) => {
    const file = FILE_MAP[key as keyof typeof FILE_MAP]
    if (!file) return null
    const normalized = value ?? (key === "system_state" ? {} : [])
    return fs.writeFile(path.join(STATE_BASE, file), JSON.stringify(normalized, null, 2))
  }).filter(Boolean) as Promise<void>[]

  if (tasks.length > 0) {
    await Promise.all(tasks)
  }
}

export async function updateSystemState(file: string, data: any) {
  await ensureBaseDir()
  const target = path.join(STATE_BASE, file)
  await fs.writeFile(target, JSON.stringify(data, null, 2))
}
