import { NextResponse } from "next/server";
import { getRoutines, createRoutine, getExecutions } from "../../../lib/routines";
import { startScheduler } from "../../../lib/scheduler";

// Trigger scheduler lazily
startScheduler();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspace = searchParams.get('workspace') || 'business';

  let routines = await getRoutines();
  routines = routines.filter(r => (r as unknown).workspace === workspace || (!(r as unknown).workspace && workspace === 'business'));

  const allExecutions = await getExecutions();

  const enhanced = routines.map((r) => {
    const execs = allExecutions.filter((e) => e.routine_id === r.id);
    const successExecs = execs.filter((e) => e.status === "success");
    const fails = execs.filter((e) => e.status === "failed");

    return {
      ...r,
      computed_success_rate: execs.length ? Math.round((successExecs.length / execs.length) * 100) : 100,
      recent_failures: fails.slice(-5),
      runs_today: execs.filter(e => {
        const d = new Date(e.started_at);
        const today = new Date();
        return d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
      }).length,
    };
  });

  return NextResponse.json(enhanced);
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const workspace = searchParams.get('workspace') || 'business';

  const body = await req.json();
  body.workspace = workspace;
  
  const created = await createRoutine(body);
  return NextResponse.json(created);
}
