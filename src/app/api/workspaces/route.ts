import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const agentsDir = path.join(process.cwd(), 'agents');
    
    // Create agents dir if it doesn't exist
    try {
      await fs.access(agentsDir);
    } catch {
      await fs.mkdir(agentsDir, { recursive: true });
    }

    const entries = await fs.readdir(agentsDir, { withFileTypes: true });
    const agents = entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);

    return NextResponse.json({ agents });
  } catch (error) {
    console.error('Error reading agents directory:', error);
    return NextResponse.json({ error: 'Failed to read agents' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { agentId } = await request.json();
    if (!agentId || typeof agentId !== 'string' || agentId.includes('..') || agentId.length > 50) {
      return NextResponse.json({ error: 'Invalid agent ID' }, { status: 400 });
    }

    const agentDir = path.join(process.cwd(), 'agents', agentId);
    
    try {
      await fs.access(agentDir);
      return NextResponse.json({ error: 'Agent already exists' }, { status: 400 });
    } catch {
      // Directory doesn't exist, which is what we want
    }

    await fs.mkdir(agentDir, { recursive: true });

    const coreFiles = [
      'IDENTITY.md',
      'MISSION.md',
      'OPERATIONS.md',
      'MEMORY.md',
      'CONTEXT.md',
      'TASKS.md',
      'TOOLS.md'
    ];

    // Scaffold baseline files
    for (const file of coreFiles) {
      let content = `# ${file.replace('.md', '')}\n\n`;
      if (file === 'IDENTITY.md') {
         content += `Name: ${agentId.charAt(0).toUpperCase() + agentId.slice(1)}\nRole: AI Agent\n`;
      }
      await fs.writeFile(path.join(agentDir, file), content, 'utf-8');
    }

    return NextResponse.json({ success: true, agentId });
  } catch (error) {
    console.error('Error creating agent:', error);
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
  }
}
