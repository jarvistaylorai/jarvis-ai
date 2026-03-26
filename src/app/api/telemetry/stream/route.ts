import { NextResponse } from 'next/server';
import { eventBus } from '@/lib/services/event-bus';
import { getTelemetrySummary } from '@/lib/services/telemetry-service';
import { Agent, Task, Project, Alert, TelemetryEvent } from '@/types/contracts';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace') || 'business';
    const encoder = new TextEncoder();

    const initial = await getTelemetrySummary(workspaceId);

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        let heartbeat: any;
        let unsubscribe: any;

        const cleanup = () => {
          if (heartbeat) clearInterval(heartbeat);
          if (unsubscribe) unsubscribe();
        };

        const send = (event: TelemetryEvent) => {
          const payloadWorkspace = (event.payload?.workspace_id || event.payload?.workspace) ?? workspaceId;
          if (payloadWorkspace !== workspaceId) return;
          try {
            controller.enqueue(
              encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`)
            );
          } catch (err) {
            cleanup();
          }
        };

        heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(': keep-alive\n\n'));
          } catch (err) {
            cleanup();
          }
        }, 15000);

        try {
          controller.enqueue(
            encoder.encode(`event: snapshot\ndata: ${JSON.stringify(initial)}\n\n`)
          );
          unsubscribe = eventBus.subscribe(send);
          controller.enqueue(encoder.encode(': stream-started\n\n'));
        } catch (err) {
          cleanup();
        }

        request.signal.addEventListener('abort', cleanup);
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive'
      }
    });
  } catch (error: unknown) {
    console.error('API Error [GET /api/telemetry/stream]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
