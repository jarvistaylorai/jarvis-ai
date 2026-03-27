import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const config = await prisma.agent_model_config.findUnique({
      where: { agent_id: id },
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    
    const config = await prisma.agent_model_config.upsert({
      where: { agent_id: id },
      update: {
        primary_model_id: data.primary_model_id,
        fallback_model_id: data.fallback_model_id,
        max_tokens: data.max_tokens,
        max_cost: data.max_cost,
        mode: data.mode
      },
      create: {
        agent_id: id,
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
