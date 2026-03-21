import { NextResponse } from "next/server";
import { getRoutine, updateRoutine } from "../../../../lib/routines";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const routine = await getRoutine(id);
  if (!routine) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(routine);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  try {
    const updated = await updateRoutine(id, body);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
