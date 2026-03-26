import { NextResponse } from 'next/server';
import { recordTelemetry } from '@/lib/services/telemetry-service';
import { eventBus } from '@/lib/services/event-bus';
import { TelemetryCategory, TelemetrySeverity } from '@contracts';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, agent_id, task_id, project_id, timestamp, metadata } = body;

    if (!type) {
      return NextResponse.json({ error: 'type is required' }, { status: 400 });
    }

    let category = TelemetryCategory.EVENT;
    let severity = TelemetrySeverity.INFO;

    if (type === 'AGENT_STATUS') category = TelemetryCategory.HEARTBEAT;
    else if (type.includes('ERROR') || type.includes('FAIL')) {
      category = TelemetryCategory.ERROR;
      severity = TelemetrySeverity.CRITICAL;
    } else if (type === 'LOG_MESSAGE') {
      category = TelemetryCategory.LOG;
    }

    const telemetry = await recordTelemetry({
      workspaceId: metadata?.workspace_id || 'business',
      agentId: agent_id,
      taskId: task_id,
      projectId: project_id,
      category,
      severity,
      eventType: type,
      message: metadata?.message || `Event: ${type}`,
      payload: metadata
    });

    eventBus.publish({ type: 'telemetry.created' as any, payload: telemetry as any });

    return NextResponse.json(telemetry, { status: 201 });
  } catch (error: unknown) {
    console.error('API Error [POST /api/telemetry]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
