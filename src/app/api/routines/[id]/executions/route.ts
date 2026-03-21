import { NextResponse } from "next/server";
import { getExecutions } from "../../../../../lib/routines";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const executions = await getExecutions(id);
  
  // Return the latest 50 for the detail panel
  return NextResponse.json(executions.slice(-50));
}
