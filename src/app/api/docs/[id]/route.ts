import { NextResponse } from 'next/server';
import { getDocById, saveDoc } from '@/lib/docs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // In Next 15 App router, params is Promise
) {
  try {
    const resolvedParams = await params;
    const doc = getDocById(resolvedParams.id);
    if (!doc) {
      return NextResponse.json({ error: 'Doc not found' }, { status: 404 });
    }
    return NextResponse.json(doc);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch doc' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const existingDoc = getDocById(resolvedParams.id);
    if (!existingDoc) {
      return NextResponse.json({ error: 'Doc not found' }, { status: 404 });
    }

    const updates = await request.json();
    
    const updatedDoc = {
      ...existingDoc,
      ...updates,
      id: existingDoc.id, // Prevent overriding ID
      updated_at: new Date().toISOString(),
    };

    saveDoc(updatedDoc);

    return NextResponse.json(updatedDoc);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update doc' }, { status: 500 });
  }
}
