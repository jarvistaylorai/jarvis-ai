import path from 'path';
import { NextResponse } from 'next/server';
import { getAllDocs, saveDoc } from '@/lib/docs';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspace = searchParams.get('workspace') || 'business';

    const docs = getAllDocs().filter((doc) => {
      const declaredWorkspace = doc.workspace || doc.frontmatter.workspace;
      const effectiveWorkspace = declaredWorkspace && declaredWorkspace.length > 0 ? declaredWorkspace : 'business';
      return effectiveWorkspace === workspace;
    });

    const grouped = docs.reduce<Record<string, typeof docs>>((acc, doc) => {
      const bucket = doc.category || doc.type || 'other';
      if (!acc[bucket]) acc[bucket] = [];
      acc[bucket].push(doc);
      return acc;
    }, {});

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
    const id = body.id || `doc-${uuidv4().substring(0, 8)}`;
    const title = body.title || 'New Document';
    const category = body.category || 'knowledge';
    const tags = normalizeTags(body.tags);
    const content = typeof body.content === 'string' ? body.content : '';

    const frontmatter = {
      id,
      title,
      workspace,
      category,
      tags,
      type: body.type || category,
      created_at: body.created_at || now,
      updated_at: now,
      ...(typeof body.frontmatter === 'object' ? body.frontmatter : {}),
    };

    const relativePath = path.join(selectDirectory(frontmatter.type || category), `${id}.md`);
    const newDoc = saveDoc(relativePath, { frontmatter, body: content }) ?? {
      id,
      title,
      type: frontmatter.type,
      category,
      tags,
      workspace,
      path: relativePath,
      frontmatter,
      content,
      lastModified: now,
    };

    return NextResponse.json(newDoc, { status: 201 });
  } catch (error) {
    console.error('Error creating doc:', error);
    return NextResponse.json({ error: 'Failed to create doc' }, { status: 500 });
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

function selectDirectory(type?: string): string {
  switch ((type || '').toLowerCase()) {
    case 'project':
    case 'projects':
      return 'Projects';
    case 'daily':
    case 'daily-notes':
    case 'dailynotes':
    case 'journal':
      return 'DailyNotes';
    default:
      return 'Knowledge';
  }
}
