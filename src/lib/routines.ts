import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Schemas
export type Routine = {
  id: string;
  name: string;
  description?: string;
  agent_id: string;
  enabled: boolean;
  schedule_type: "cron" | "interval";
  cron_expression?: string;
  interval_seconds?: number;
  runs_per_day?: number;
  last_run_at?: string;
  next_run_at?: string;
  status: "healthy" | "failing" | "paused";
  created_at: string;
};

export type RoutineExecution = {
  id: string;
  routine_id: string;
  started_at: string;
  completed_at?: string;
  status: "success" | "failed" | "running";
  duration_ms?: number;
  output_summary?: string;
  error_message?: string;
};

// Paths
const SYSTEM_DIR = path.join(process.cwd(), "system", "routines");
const ROUTINES_FILE = path.join(SYSTEM_DIR, "routines.json");
const EXECUTIONS_FILE = path.join(SYSTEM_DIR, "executions.json");

// Helpers for atomic writes
async function writeAtomic(filePath: string, data: any) {
  const tmpPath = `${filePath}.${uuidv4()}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmpPath, filePath);
}

// Data access: Routines
export async function getRoutines(): Promise<Routine[]> {
  try {
    const data = await fs.readFile(ROUTINES_FILE, "utf8");
    return JSON.parse(data);
  } catch (err: any) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

export async function getRoutine(id: string): Promise<Routine | undefined> {
  const routines = await getRoutines();
  return routines.find((r) => r.id === id);
}

export async function saveRoutines(routines: Routine[]): Promise<void> {
  await writeAtomic(ROUTINES_FILE, routines);
}

export async function updateRoutine(id: string, updates: Partial<Routine>): Promise<Routine> {
  const routines = await getRoutines();
  const index = routines.findIndex((r) => r.id === id);
  if (index === -1) throw new Error("Routine not found");

  const updated = { ...routines[index], ...updates };
  routines[index] = updated;
  await saveRoutines(routines);
  return updated;
}

export async function createRoutine(input: Omit<Routine, "id" | "created_at" | "status">): Promise<Routine> {
  const routines = await getRoutines();
  const routine: Routine = {
    id: uuidv4(),
    created_at: new Date().toISOString(),
    status: input.enabled ? "healthy" : "paused",
    ...input,
  };
  routines.push(routine);
  await saveRoutines(routines);
  return routine;
}

// Data access: Executions
export async function getExecutions(routineId?: string): Promise<RoutineExecution[]> {
  try {
    const data = await fs.readFile(EXECUTIONS_FILE, "utf8");
    // Since it's an array, just parse it
    const executions: RoutineExecution[] = JSON.parse(data);
    if (routineId) {
      return executions.filter((e) => e.routine_id === routineId);
    }
    return executions;
  } catch (err: any) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

export async function saveExecutions(executions: RoutineExecution[]): Promise<void> {
  await writeAtomic(EXECUTIONS_FILE, executions);
}

export async function addExecution(execution: RoutineExecution): Promise<void> {
  // To keep it simple, we read the whole array, push, and write.
  // In a high-throughput system this would be appendFile with JSONL format.
  const executions = await getExecutions();
  executions.push(execution);
  await saveExecutions(executions);
}

export async function updateExecution(id: string, updates: Partial<RoutineExecution>): Promise<RoutineExecution> {
  const executions = await getExecutions();
  const index = executions.findIndex((e) => e.id === id);
  if (index === -1) throw new Error("Execution not found");
  
  const updated = { ...executions[index], ...updates };
  executions[index] = updated;
  await saveExecutions(executions);
  return updated;
}
