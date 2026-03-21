import { NextResponse } from 'next/server';
import { getAllDocs, saveDoc } from '@/lib/docs';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspace = searchParams.get('workspace') || 'business';

    let docs = getAllDocs();
    docs = docs.filter(d => (d as any).workspace === workspace || (!(d as any).workspace && workspace === 'business'));
    
    // Group by category
    const grouped = docs.reduce((acc, doc) => {
      const cat = doc.category || 'other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(doc);
      return acc;
    }, {} as Record<string, typeof docs>);

    return NextResponse.json({ docs, grouped });
  } catch (error) {
    console.error('Error fetching docs:', error);
    return NextResponse.json({ error: 'Failed to fetch docs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspace = searchParams.get('workspace') || 'business';
    const body = await request.json();
    
    const now = new Date().toISOString();
    const newDoc = {
      id: body.id || `doc-${uuidv4().substring(0, 8)}`,
      workspace,
      title: body.title || 'New Document',
      content: body.content || '',
      category: body.category || 'system',
      tags: body.tags || [],
      created_at: now,
      updated_at: now,
    };

    saveDoc(newDoc);

    return NextResponse.json(newDoc, { status: 201 });
  } catch (error) {
    console.error('Error creating doc:', error);
    return NextResponse.json({ error: 'Failed to create doc' }, { status: 500 });
  }
}
