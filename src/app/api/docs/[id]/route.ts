import { NextResponse } from 'next/server';
import { getDocById, saveDoc } from '@/lib/docs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const doc = getDocById(resolvedParams.id);
    if (!doc) {
      return NextResponse.json({ error: 'Doc not found' }, { status: 404 });
    }
    return NextResponse.json(doc);
  } catch (error) {
    console.error('Error fetching doc:', error);
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
    const contentUpdate = typeof updates.content === 'string' ? updates.content : undefined;
    const frontmatterUpdates: Record<string, unknown> = {};

    if (updates.title !== undefined) frontmatterUpdates.title = updates.title;
    if (updates.category !== undefined) frontmatterUpdates.category = updates.category;
    if (updates.workspace !== undefined) frontmatterUpdates.workspace = updates.workspace;
    if (updates.type !== undefined) frontmatterUpdates.type = updates.type;
    if (updates.frontmatter && typeof updates.frontmatter === 'object') {
      Object.assign(frontmatterUpdates, updates.frontmatter);
    }
    if (updates.tags !== undefined) frontmatterUpdates.tags = normalizeTags(updates.tags);

    frontmatterUpdates.updated_at = new Date().toISOString();

    const updatedDoc = saveDoc(existingDoc.path, {
      frontmatter: frontmatterUpdates as Record<string, unknown>,
      body: contentUpdate,
    }) ?? existingDoc;

    return NextResponse.json(updatedDoc);
  } catch (error) {
    console.error('Error updating doc:', error);
    return NextResponse.json({ error: 'Failed to update doc' }, { status: 500 });
  }
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((tag) => typeof tag === 'string').map((tag) => tag.trim()).filter(Boolean);
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return [value.trim()];
  }

  return [];
}
