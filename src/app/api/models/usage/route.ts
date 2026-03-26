import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const logs = await prisma.model_usage_log.findMany({
      orderBy: { timestamp: "desc" },
      take: 50,
      include: {
        model: true
      }
    });

    const activeAgentsCount = await prisma.agents.count({ where: { status: "active" } });
    const idleAgentsCount = await prisma.agents.count({ where: { status: "idle" } });
    
    const totalSessions = await prisma.model_usage_log.count();

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentLogs = await prisma.model_usage_log.findMany({
      where: { timestamp: { gte: yesterday } }
    });

    const tokensUsed24h = recentLogs.reduce((sum, log) => sum + log.tokens, 0);
    const totalCost24h = recentLogs.reduce((sum, log) => sum + log.cost, 0);

    const aggregateCost = await prisma.model_usage_log.aggregate({ _sum: { cost: true } });
    const avgCostPerTask = totalSessions > 0 && aggregateCost._sum.cost ? aggregateCost._sum.cost / totalSessions : 0;
    
    const totalAgents = activeAgentsCount + idleAgentsCount;
    const avgTokensPerAgent = totalAgents > 0 ? tokensUsed24h / totalAgents : 0;

    return NextResponse.json({
      global_stats: {
        active_agents: activeAgentsCount,
        idle_agents: idleAgentsCount,
        total_sessions: totalSessions,
        tokens_used_24h: tokensUsed24h,
        total_cost_24h: totalCost24h,
        avg_cost_per_task: avgCostPerTask,
        avg_tokens_per_agent: avgTokensPerAgent,
        failures: 0 // Mocked for now
      },
      recent_sessions: logs
    });
  } catch (error) {
    console.error("Error fetching usage logs:", error);
    return NextResponse.json({ error: "Failed to fetch usage logs" }, { status: 500 });
  }
}
