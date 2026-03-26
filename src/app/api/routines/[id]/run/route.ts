import { NextResponse } from "next/server";
import { getRoutine } from "../../../../../lib/routines";
import { executeRoutine, startScheduler } from "../../../../../lib/scheduler";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  startScheduler(); // ensure scheduler is alive
  const { id } = await params;
  const routine = await getRoutine(id);
  
  if (!routine) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const execution = await executeRoutine(routine); // this kicks it off and waits
    return NextResponse.json(execution);
  } catch (err: unknown) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
