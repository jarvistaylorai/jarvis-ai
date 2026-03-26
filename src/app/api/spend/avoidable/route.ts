import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspace = searchParams.get('workspace') || 'business';

    const [avoidableByAgent, messageClassStats, reasonStats, downgradeStats, totalCalls, duplicateCalls, avoidableEvents, trendRows, fingerprintLeaders, fingerprintTrend] = await Promise.all([
      prisma.spendLog.groupBy({
        by: ['agent_id'],
        where: { workspace },
        _sum: { avoided_usd: true, avoided_tokens: true, cost: true },
        orderBy: { _sum: { avoided_usd: 'desc' } },
        take: 5,
      }),
      prisma.spendLog.groupBy({
        by: ['message_class'],
        where: { workspace, message_class: { not: null } },
        _avg: { tokens_output: true },
        _sum: { tokens_output: true, cost: true },
        orderBy: { _avg: { tokens_output: 'desc' } },
        take: 5,
      }),
      prisma.spendLog.groupBy({
        by: ['avoided_reason'],
        where: { workspace, avoided_reason: { not: null } },
        _sum: { avoided_usd: true, avoided_tokens: true },
      }),
      prisma.spendLog.groupBy({
        by: ['downgraded_from'],
        where: { workspace, downgraded_from: { not: null } },
        _sum: { avoided_usd: true },
        orderBy: { _sum: { avoided_usd: 'desc' } },
        take: 5,
      }),
      prisma.spendLog.count({ where: { workspace } }),
      prisma.spendLog.count({ where: { workspace, duplicate_status: { not: 'fresh' } } }),
      prisma.telemetry_events.findMany({
        where: {
          workspace_id: workspace,
          event_type: 'spend.avoidable',
        },
        orderBy: { created_at: 'desc' },
        take: 500,
      }),
      prisma.$queryRaw<Array<{ day: Date; usd: number }>>`
        SELECT date_trunc('day', "created_at") as day, SUM("avoided_usd") as usd
        FROM "spendLog"
        WHERE "workspace" = ${workspace} AND "created_at" >= now() - interval '7 days'
        GROUP BY day
        ORDER BY day;
      `,
      prisma.promptFingerprint.findMany({
        where: { workspace },
        orderBy: { duplicate_calls: 'desc' },
        take: 5,
      }),
      prisma.$queryRaw<Array<{ day: Date; duplicates: number }>>`
        SELECT "day" as day, SUM("duplicate_calls") as duplicates
        FROM "promptFingerprintDay"
        WHERE "workspace" = ${workspace} AND "day" >= now() - interval '30 days'
        GROUP BY day
        ORDER BY day;
      `,
    ]);

    const downgradeEvents: { reason: string; usd: number }[] = [];

    for (const event of avoidableEvents) {
      const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
      if (!payload) continue;
      if (payload.reason === 'downgrade') {
        downgradeEvents.push({ reason: payload.downgradedFrom || 'unknown', usd: payload.usdAvoided || 0 });
      }
    }

    const duplicationHotspots = fingerprintLeaders.map((row) => ({
      promptHash: row.prompt_hash,
      totalCalls: row.total_calls,
      duplicateCalls: row.duplicate_calls,
      reuseRate: row.total_calls ? row.duplicate_calls / row.total_calls : 0,
    }));

    const promptDuplicateTrend = fingerprintTrend.map((row) => ({
      day: row.day,
      duplicates: Number(row.duplicates || 0),
    }));

    const downgradeSavings = downgradeEvents.reduce<Record<string, number>>((acc, evt) => {
      acc[evt.reason] = (acc[evt.reason] || 0) + evt.usd;
      return acc;
    }, {});

    return NextResponse.json({
      summary: {
        duplicateRate: totalCalls > 0 ? duplicateCalls / totalCalls : 0,
        avoidedUsd7d: trendRows.reduce((sum, row) => sum + Number(row.usd || 0), 0),
      },
      avoidableByAgent: avoidableByAgent.map((row) => ({
        agentId: row.agent_id,
        avoidedUsd: row._sum.avoided_usd || 0,
        avoidedTokens: row._sum.avoided_tokens || 0,
        totalCost: row._sum.cost || 0,
      })),
      verboseClasses: messageClassStats.map((row) => ({
        messageClass: row.message_class,
        avgOutputTokens: row._avg.tokens_output || 0,
        totalCost: row._sum.cost || 0,
      })),
      savingsByReason: reasonStats
        .filter((row) => row.avoided_reason)
        .map((row) => ({
          reason: row.avoided_reason,
          avoidedUsd: row._sum.avoided_usd || 0,
          avoidedTokens: row._sum.avoided_tokens || 0,
        })),
      downgradeSavings,
      duplicationHotspots,
      promptDuplicateTrend,
      trend: trendRows.map((row) => ({ day: row.day, usd: Number(row.usd || 0) })),
    });
  } catch (error) {
    console.error('Avoidable spend endpoint failed:', error);
    return NextResponse.json({ error: 'Failed to load avoidable spend metrics' }, { status: 500 });
  }
}
