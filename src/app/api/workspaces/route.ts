import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/services/database';

export async function GET() {
  try {
    const dbAgents = await prisma.agents.findMany({
      where: {
        NOT: {
          handle: { startsWith: 'deleted-' }
        }
      },
      select: { handle: true },
      distinct: ['handle']
    });
    
    // Only return defined handles
    const agents = dbAgents.map(a => a.handle).filter(Boolean);

    return NextResponse.json({ agents });
  } catch (error) {
    console.error('Error reading agents from db:', error);
    return NextResponse.json({ error: 'Failed to read agents' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { agentId } = await request.json();
    if (!agentId || typeof agentId !== 'string' || agentId.length > 50) {
      return NextResponse.json({ error: 'Invalid agent ID' }, { status: 400 });
    }

    // Find the agent in DB using the handle
    const agent = await prisma.agents.findFirst({
      where: { handle: agentId }
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found in database. Create the agent first.' }, { status: 404 });
    }

    const coreFiles = [
      'IDENTITY.md',
      'MISSION.md',
      'OPERATIONS.md',
      'MEMORY.md',
      'CONTEXT.md',
      'TASKS.md',
      'TOOLS.md'
    ];

    // Scaffold baseline files directly in Postgres
    for (const file of coreFiles) {
      let content = `# ${file.replace('.md', '')}\n\n`;
      if (file === 'IDENTITY.md') {
         content += `Name: ${agent.name}\nRole: ${agent.role || 'AI Agent'}\n`;
      }
      
      await prisma.agent_context_files.upsert({
        where: {
          agent_id_file_name: {
            agent_id: agent.id,
            file_name: file
          }
        },
        update: {}, // Don't override if already exists
        create: {
          agent_id: agent.id,
          file_name: file,
          content: content
        }
      });
    }

    return NextResponse.json({ success: true, agentId });
  } catch (error) {
    console.error('Error creating agent context files:', error);
    return NextResponse.json({ error: 'Failed to create agent context files' }, { status: 500 });
  }
}
