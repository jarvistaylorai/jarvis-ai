import { NextResponse } from 'next/server';
import { getDashboardSnapshot } from '@/lib/services/dashboard-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace') || 'business';
    const snapshot = await getDashboardSnapshot(workspaceId);
    return NextResponse.json(snapshot);
  } catch (error: any) {
    console.error('API Error [GET /api/dashboard]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
