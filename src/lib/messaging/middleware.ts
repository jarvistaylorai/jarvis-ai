/**
 * Messaging Middleware
 * Express/Next.js middleware for automatic message discipline
 */

import { NextRequest, NextResponse } from 'next/server';
import { MessageClassId } from './messageClasses';
import { prepareMessage, DeliveryArtifact, InternalArtifact } from './policy';
import { messageTelemetry } from './telemetry';

export interface MessageContext {
  messageClass?: MessageClassId;
  agentId?: string;
  taskId?: string;
  operation?: string;
  preferTemplate?: boolean;
  compress?: boolean;
}

/**
 * Middleware that wraps API responses with message discipline
 */
export function withMessageDiscipline(
  handler: (req: NextRequest, context: MessageContext) => Promise<NextResponse>,
  defaultClass?: MessageClassId
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const ctx: MessageContext = {
      messageClass: defaultClass,
      ...extractContextFromRequest(req),
    };

    const response = await handler(req, ctx);
    
    // Apply discipline to response if it contains a message
    if (shouldApplyDiscipline(response)) {
      return applyDisciplineToResponse(response, ctx);
    }

    return response;
  };
}

function extractContextFromRequest(req: NextRequest): Partial<MessageContext> {
  const headers = req.headers;
  return {
    messageClass: headers.get('x-message-class') as MessageClassId | undefined,
    agentId: headers.get('x-agent-id') || undefined,
    taskId: headers.get('x-task-id') || undefined,
    operation: headers.get('x-operation') || undefined,
    preferTemplate: headers.get('x-prefer-template') === 'true',
    compress: headers.get('x-compress-response') === 'true',
  };
}

function shouldApplyDiscipline(response: NextResponse): boolean {
  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('application/json') || contentType.includes('text/plain');
}

async function applyDisciplineToResponse(
  response: NextResponse,
  ctx: MessageContext
): Promise<NextResponse> {
  if (!ctx.messageClass) {
    return response;
  }

  try {
    const body = await response.json();
    
    // If response has a message field, apply discipline
    if (body.message && typeof body.message === 'string') {
      const { artifact, internal } = prepareMessage({
        messageClass: ctx.messageClass,
        content: body.message,
        context: {
          agentId: ctx.agentId,
          taskId: ctx.taskId,
          operation: ctx.operation,
          ...body.meta,
        },
      });

      if (artifact) {
        body.message = artifact.content;
        body._meta = {
          ...body._meta,
          tokenEstimate: artifact.tokenEstimate,
          compressionApplied: artifact.compressionApplied,
          messageClass: ctx.messageClass,
        };

        // Record telemetry
        messageTelemetry.recordDelivery(
          ctx.messageClass,
          artifact,
          ctx.operation
        );
      }

      // Keep internal artifact in _internal for debugging
      if (internal) {
        body._internal = {
          timestamp: internal.timestamp,
          reasoning: internal.fullReasoning,
        };
      }
    }

    return NextResponse.json(body, {
      status: response.status,
      headers: response.headers,
    });
  } catch {
    // If parsing fails, return original response
    return response;
  }
}

/**
 * Higher-order function for API route handlers
 */
export function createDisciplinedHandler(
  defaultClass: MessageClassId,
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return withMessageDiscipline(
    async (req: NextRequest, ctx: MessageContext) => handler(req),
    defaultClass
  );
}
