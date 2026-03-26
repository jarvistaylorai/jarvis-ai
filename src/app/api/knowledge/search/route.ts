import { NextResponse } from 'next/server';
import { searchDocs } from '@/lib/docs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    
    const results = searchDocs(query);
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error searching docs:', error);
    return NextResponse.json({ error: 'Failed to search docs' }, { status: 500 });
  }
}
