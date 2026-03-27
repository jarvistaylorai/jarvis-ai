import { NextRequest, NextResponse } from 'next/server';
import { executePatchedOpenClawRequest, type CommandChannelInstrumentation } from '@/lib/patches/integration';
import { openclaw } from '@/lib/openclaw/client';

interface ChatRequestBody {
  agentId?: string;
  model?: string;
  workspaceId?: string;
  messages?: { role: 'user' | 'assistant' | 'system'; content: string }[];
  instrumentation?: CommandChannelInstrumentation;
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    let body: ChatRequestBody;
    try {
      body = rawBody ? (JSON.parse(rawBody) as ChatRequestBody) : {};
    } catch (parseError) {
      console.error('[Chat API] Invalid JSON payload', parseError);
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const agentId = body.agentId?.trim();
    const model = body.model?.trim();
    const workspaceId = body.workspaceId?.trim() || 'business';
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const headerRequestId = request.headers.get('x-command-channel-request-id');
    const headerBodyChars = request.headers.get('x-command-channel-body-chars');
    const derivedRequestId =
      body.instrumentation?.requestId ||
      headerRequestId ||
      `srv-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const instrumentation: CommandChannelInstrumentation = {
      requestId: derivedRequestId,
      client: body.instrumentation?.client,
      metadata: body.instrumentation?.metadata,
    };
    instrumentation.server = {
      rawBodyChars: rawBody.length,
      headerReportedChars: headerBodyChars ? Number(headerBodyChars) : undefined,
      rawMessageCount: messages.length,
    };
    console.log('[CommandChannel][Instrumentation][ServerRequest]', {
      requestId: instrumentation.requestId,
      server: instrumentation.server,
      client: instrumentation.client,
    });

    if (!agentId) {
      return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
    }

    if (messages.length === 0) {
      return NextResponse.json({ error: 'At least one message is required' }, { status: 400 });
    }

    const result = await executePatchedOpenClawRequest(
      {
        agentId,
        model,
        messages,
        workspaceId,
        instrumentation,
      },
      openclaw
    );

    return NextResponse.json({
      content: result.content,
      modelUsed: result.modelUsed,
      budgetStatus: result.budgetStatus,
    });
  } catch (error) {
    console.error('[Chat API] Failed to process request', error);
    return NextResponse.json({ error: 'Failed to process chat request' }, { status: 500 });
  }
}
