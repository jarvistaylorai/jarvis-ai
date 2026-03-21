import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const models = await prisma.model.findMany({
      include: {
        usage_logs: true,
        configs_as_primary: { include: { agent: true } },
        configs_as_fallback: { include: { agent: true } }
      }
    });

    const enrichedModels = models.map(model => {
      const totalSessions = model.usage_logs.length;
      const totalTokens = model.usage_logs.reduce((sum, log) => sum + log.tokens, 0);
      const totalCost = model.usage_logs.reduce((sum, log) => sum + log.cost, 0);
      const avgLatency = totalSessions > 0 
        ? model.usage_logs.reduce((sum, log) => sum + (log.duration || 0), 0) / totalSessions
        : 0;

      const assignedAgents = Array.from(new Set([
        ...model.configs_as_primary.map(c => c.agent.name),
        ...model.configs_as_fallback.map(c => c.agent.name)
      ]));

      let capabilities = [];
      try {
        capabilities = JSON.parse(model.capabilities);
      } catch (e) {
        // use empty
      }

      return {
        id: model.id,
        name: model.name,
        provider: model.provider,
        cost_per_1k: model.cost_per_1k,
        capabilities,
        status: model.status,
        usage: {
          sessions: totalSessions,
          tokens: totalTokens,
          cost: totalCost,
          avg_latency: avgLatency
        },
        assigned_agents: assignedAgents
      };
    });

    return NextResponse.json(enrichedModels);
  } catch (error) {
    console.error("Error fetching models:", error);
    return NextResponse.json({ error: "Failed to fetch models" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const newModel = await prisma.model.create({
      data: {
        name: data.name,
        provider: data.provider,
        cost_per_1k: data.cost_per_1k,
        capabilities: JSON.stringify(data.capabilities || []),
        status: data.status || "active",
      }
    });
    return NextResponse.json(newModel);
  } catch (error) {
    console.error("Error creating model:", error);
    return NextResponse.json({ error: "Failed to create model" }, { status: 500 });
  }
}
