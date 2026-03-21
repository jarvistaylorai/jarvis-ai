import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const config = await prisma.agentModelConfig.findUnique({
      where: { agent_id: params.id },
      include: {
        primary_model: true,
        fallback_model: true
      }
    });

    if (!config) {
      return NextResponse.json({ error: "Config not found" }, { status: 404 });
    }

    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch config" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    
    const config = await prisma.agentModelConfig.upsert({
      where: { agent_id: params.id },
      update: {
        primary_model_id: data.primary_model_id,
        fallback_model_id: data.fallback_model_id,
        max_tokens: data.max_tokens,
        max_cost: data.max_cost,
        mode: data.mode
      },
      create: {
        agent_id: params.id,
        primary_model_id: data.primary_model_id,
        fallback_model_id: data.fallback_model_id,
        max_tokens: data.max_tokens,
        max_cost: data.max_cost,
        mode: data.mode
      }
    });
    
    return NextResponse.json(config);
  } catch (error) {
    console.error("Config update error:", error);
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
  }
}
