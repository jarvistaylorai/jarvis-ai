import { NextResponse } from 'next/server';
import { prisma } from '@/lib/services/database';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const memoryPath = path.join(process.cwd(), 'MEMORY.md');
    
    if (!fs.existsSync(memoryPath)) {
      return NextResponse.json({ success: false, error: 'MEMORY.md does not exist at root' }, { status: 404 });
    }

    const content = fs.readFileSync(memoryPath, 'utf8');

    // Get orchestrator ID to act as global memory anchor
    const orchestrator = await prisma.agents.findFirst({
      where: { handle: 'orchestrator' }
    });

    if (!orchestrator) {
      return NextResponse.json({ success: false, error: 'Orchestrator not found in DB' }, { status: 500 });
    }

    // Upsert into agent_context_files
    await prisma.agent_context_files.upsert({
      where: {
        agent_id_file_name: {
          agent_id: orchestrator.id,
          file_name: 'MEMORY.md'
        }
      },
      update: {
        content: content,
        updated_at: new Date()
      },
      create: {
        agent_id: orchestrator.id,
        file_name: 'MEMORY.md',
        content: content
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Canonical MEMORY.md synchronized successfully.',
      metadata: {
        bytes: Buffer.byteLength(content, 'utf8'),
        agent_id: orchestrator.id,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Sync Canonical Memory Error]', error);
    return NextResponse.json({ success: false, error: 'Failed to sync canonical memory' }, { status: 500 });
  }
}
