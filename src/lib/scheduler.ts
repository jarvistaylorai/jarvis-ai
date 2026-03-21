const cronParser = require("cron-parser");
import { v4 as uuidv4 } from "uuid";
import { getRoutines, updateRoutine, addExecution, Routine, RoutineExecution } from "./routines";

// Need a global singleton for the timer to avoid multiple intervals during hot reload
const globalForScheduler = global as unknown as { schedulerInterval?: NodeJS.Timeout };

let isRunning = false;

// Dummy worker to simulate execution
async function runJob(routine: Routine) {
  // We can eventually route this to the actual agent/script.
  // For now, simulate work.
  const duration = Math.floor(Math.random() * 2000) + 500; // 500ms - 2.5s
  await new Promise((resolve) => setTimeout(resolve, duration));

  // 10% chance of failure for simulation
  const isFailure = Math.random() > 0.9;
  if (isFailure) {
    throw new Error("Simulated job failure (timeout or agent specific error)");
  }

  return `Scanned opportunities. Took ${duration}ms.`;
}

export async function executeRoutine(routine: Routine): Promise<RoutineExecution> {
  const executionId = uuidv4();
  const started_at = new Date().toISOString();

  const execution: RoutineExecution = {
    id: executionId,
    routine_id: routine.id,
    started_at,
    status: "running",
  };

  // Add initial running execution log
  await addExecution(execution);

  const start = Date.now();
  try {
    const summary = await runJob(routine);
    const completed_at = new Date().toISOString();
    const duration_ms = Date.now() - start;

    execution.completed_at = completed_at;
    execution.status = "success";
    execution.duration_ms = duration_ms;
    execution.output_summary = summary;

    await updateRoutine(routine.id, {
      last_run_at: completed_at,
      status: "healthy",
      // success_rate will be computed dynamically or keep last runs
    });

  } catch (error: any) {
    const completed_at = new Date().toISOString();
    const duration_ms = Date.now() - start;

    execution.completed_at = completed_at;
    execution.status = "failed";
    execution.duration_ms = duration_ms;
    execution.error_message = error.message;

    await updateRoutine(routine.id, {
      last_run_at: completed_at,
      status: "failing",
    });
  }

  // Update execution in log to success/failed
  // Since we don't have updateExecution easily without a separate update array call,
  // we can use a helper, but wait, addExecution just pushed it. 
  // Let's implement updateExecution in routines.ts or just read/write here.
  const { updateExecution: updateExecRecord } = await import("./routines");
  await updateExecRecord(executionId, execution);

  return execution;
}

export async function checkAndRunRoutines() {
  if (isRunning) return;
  isRunning = true;

  try {
    const routines = await getRoutines();
    const now = new Date();

    for (const routine of routines) {
      if (!routine.enabled) continue;

      let shouldRun = false;
      let computedNextRun = routine.next_run_at ? new Date(routine.next_run_at) : null;

      // If no next_run_at, compute it immediately or run now
      if (!computedNextRun) {
        shouldRun = true;
      } else if (now >= computedNextRun) {
        shouldRun = true;
      }

      if (shouldRun) {
        // Trigger execution asynchronously without blocking the loop
        executeRoutine(routine).catch(console.error);

        // Compute next run immediately so it doesn't trigger again
        if (routine.schedule_type === "cron" && routine.cron_expression) {
          try {
            const interval = cronParser.parseExpression(routine.cron_expression);
            computedNextRun = interval.next().toDate();
          } catch (e) {
            console.error("Invalid cron", routine.cron_expression);
            // Default retry in 5 mins
             computedNextRun = new Date(now.getTime() + 5 * 60000);
          }
        } else if (routine.schedule_type === "interval" && routine.interval_seconds) {
           computedNextRun = new Date(now.getTime() + routine.interval_seconds * 1000);
        } else {
           // Fallback 1 min
           computedNextRun = new Date(now.getTime() + 60000);
        }

        // @ts-ignore
        await updateRoutine(routine.id, { next_run_at: computedNextRun.toISOString() });
      }
    }
  } catch (err) {
    console.error("Error in scheduler loop", err);
  } finally {
    isRunning = false;
  }
}

export function startScheduler() {
  if (globalForScheduler.schedulerInterval) {
    console.log("[Scheduler] Already running.");
    return;
  }
  console.log("[Scheduler] Starting check loop...");
  globalForScheduler.schedulerInterval = setInterval(() => {
    checkAndRunRoutines();
  }, 5000);
}
