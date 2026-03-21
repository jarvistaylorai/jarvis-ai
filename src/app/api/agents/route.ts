import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient(); // Avoids assuming @/lib/prisma if we aren't sure

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspace = searchParams.get('workspace') || 'business';

    const agents = await prisma.agent.findMany({
      where: { workspace },
      orderBy: { layer: 'asc' },
    });

    const formattedAgents = agents.map((agent: any) => ({
      ...agent,
      capabilities: JSON.parse(agent.capabilities as string),
      last_active_at: agent.last_active_at.toISOString(),
    }));

    return NextResponse.json(formattedAgents);
  } catch (error) {
    console.error("Failed to fetch agents:", error);
    return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const workspace = searchParams.get('workspace') || 'business';

    const body = await req.json();
    const { name, role, description, capabilities, status, load, layer } = body;

    const newAgent = await prisma.agent.create({
      data: {
        workspace,
        name,
        role,
        description,
        capabilities: JSON.stringify(capabilities || []),
        status: status || "idle",
        load: load || "normal",
        layer: layer || "core",
      },
    });

    return NextResponse.json({
      ...newAgent,
      capabilities: JSON.parse(newAgent.capabilities),
      last_active_at: newAgent.last_active_at.toISOString(),
    });
  } catch (error) {
    console.error("Failed to create agent:", error);
    return NextResponse.json({ error: "Failed to create agent" }, { status: 500 });
  }
}
