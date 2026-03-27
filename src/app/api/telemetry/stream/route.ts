import { NextResponse } from 'next/server';
import { eventBus } from '@/lib/services/event-bus';
import { getTelemetrySummary } from '@/lib/services/telemetry-service';
import { TelemetryEvent } from '@contracts';

export const runtime = 'nodejs';

type StreamEvent = { payload?: Record<string, unknown>; type?: string; event_type?: string };

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace') || 'business';
    const encoder = new TextEncoder();

    const initial = await getTelemetrySummary(workspaceId);

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        let unsubscribe: (() => void) | undefined;
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(': keep-alive\n\n'));
          } catch (err) {
            cleanup();
          }
        }, 15000);

        const cleanup = () => {
          clearInterval(heartbeat);
          if (unsubscribe) unsubscribe();
        };

        const send = (event: StreamEvent) => {
          const payload = event.payload as Record<string, unknown> | undefined;
          const payloadWorkspace = (payload?.workspace_id ?? payload?.workspace) as string | undefined;
          if ((payloadWorkspace || workspaceId) !== workspaceId) return;
          try {
            controller.enqueue(
              encoder.encode(`event: ${event.event_type || event.type || 'message'}\ndata: ${JSON.stringify(event.payload)}\n\n`)
            );
          } catch (err) {
            cleanup();
          }
        };

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
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
