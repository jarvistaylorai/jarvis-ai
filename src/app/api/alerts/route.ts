import { NextResponse } from 'next/server';
import { listAlerts } from '@/lib/services/alert-service';
import { AlertStatus } from '@contracts';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace') || 'business';
    const limit = parseInt(searchParams.get('limit') || '25', 10);
    const cursor = searchParams.get('cursor') || undefined;
    const status = searchParams.get('status') as AlertStatus | null;

    const result = await listAlerts({
      workspaceId,
      limit: Number.isNaN(limit) ? 25 : Math.min(limit, 100),
      cursor,
      status: status && Object.values(AlertStatus).includes(status) ? status : undefined
    });

    return NextResponse.json({ data: result.data, next_cursor: result.next_cursor });
  } catch (error: unknown) {
    console.error('API Error [GET /api/alerts]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
