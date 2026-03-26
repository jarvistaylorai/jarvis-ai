import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  const start = Date.now();
  const health = {
    status: 'ok',
    database_reachable: false,
    seed_baseline_present: false,
    agent_count: 0,
    task_count: 0,
    system_state_present: false,
    memory_source_reachable: true, // agent_context_files is a DB table
    timestamp: new Date().toISOString(),
    latency_ms: 0,
  };

  try {
    // 1. Check DB Reachability & record counts
    const [agentCount, taskCount, systemState] = await Promise.all([
      prisma.agents.count(),
      prisma.tasks.count(),
      prisma.systemState.findUnique({ where: { id: 'global' } }),
    ]);

    health.database_reachable = true;
    health.agent_count = agentCount;
    health.task_count = taskCount;
    health.system_state_present = !!systemState;
    health.seed_baseline_present = agentCount > 0 && taskCount > 0 && !!systemState;
    
  } catch (err: unknown) {
    health.status = 'error';
    health.database_reachable = false;
    console.error('[Health Check Error]', err);
  }

  health.latency_ms = Date.now() - start;

  return NextResponse.json(health, { status: health.status === 'ok' ? 200 : 503 });
}
