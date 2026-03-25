import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { supabaseAdmin, BUCKET_NAME } from '@/lib/supabase-storage';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetPath = searchParams.get('path');
    const workspace = searchParams.get('workspace') || 'business';

    if (!targetPath) {
      return NextResponse.json({ error: 'Path parameter is required' }, { status: 400 });
    }

    const cleanPath = targetPath.startsWith('/') ? targetPath.slice(1) : targetPath;
    const storagePath = `${workspace}/${cleanPath}`.replace(/\/+/g, '/');

    const { data, error } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .download(storagePath);

    if (error) {
      console.error('Storage text read error:', error);
      return NextResponse.json({ error: 'File not found or access denied' }, { status: 404 });
    }

    const content = await data.text();

    return NextResponse.json({ content });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
