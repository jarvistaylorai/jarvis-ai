/**
 * Memory Service
 * Phase 2: Semantic memory retrieval with pgvector
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export interface MemoryQuery {
  query: string;
  agentId?: string;
  projectId?: string;
  taskId?: string;
  types?: string[];
  limit?: number;
  minScore?: number;
}

export interface RetrievedMemory {
  id: string;
  type: string;
  content: string;
  score: number;
  metadata: Record<string, unknown>;
}

export class MemoryService {
  
  /**
   * Retrieve relevant memories based on semantic similarity
   */
  async retrieve(query: MemoryQuery): Promise<RetrievedMemory[]> {
    const orchestrator = await prisma.agents.findFirst({ where: { handle: 'orchestrator' }, select: { id: true } });
    const globalId = orchestrator?.id;

    const normalizedQuery = query.query.replace(/[^a-zA-Z0-9\s]/g, ' ').trim().toLowerCase();
    
    let agentFilter = Prisma.empty;
    if (query.agentId && globalId && query.agentId !== globalId) {
      agentFilter = Prisma.sql`AND (agent_id = ${query.agentId}::uuid OR agent_id = ${globalId}::uuid)`;
    } else if (globalId) {
      agentFilter = Prisma.sql`AND agent_id = ${globalId}::uuid`;
    } else if (query.agentId) { // Fallback if no globalId but agentId is provided
      agentFilter = Prisma.sql`AND agent_id = ${query.agentId}::uuid`;
    }
    
    const minScore = query.minScore !== undefined ? query.minScore : 0.05;

    const results = await prisma.$queryRaw`
      WITH ranked_memories AS (
        SELECT id, agent_id, 'file' as type, file_name, content, 
               ts_rank(to_tsvector('english', content), plainto_tsquery('english', ${normalizedQuery})) + 
               CASE WHEN file_name = 'MEMORY.md' THEN 0.5 ELSE 0 END as score
        FROM agent_context_files
        WHERE 1=1 ${agentFilter}
      )
      SELECT * FROM ranked_memories
      WHERE score >= ${minScore}
      ORDER BY score DESC
      LIMIT ${query.limit || 5}
    `;

    // Map the results to determine scope for debug visibility
    return (results as unknown[]).map(r => ({
      id: r.id,
      type: r.type,
      content: r.content,
      score: r.score,
      metadata: {
        file_name: r.file_name,
        scope: r.agent_id === globalId ? 'global' : 'agent-specific'
      }
    }));
  }
  
  /**
   * Store a new memory entry
   */
  async store(memory: {
    content: string;
    type: string;
    agentId?: string;
    projectId?: string;
    taskId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<unknown> {
    if (!memory.agentId) throw new Error('agentId is required to store context files');
    
    const fileName = memory.metadata?.file_name || `memory-${Date.now()}.txt`;
    
    return await prisma.agent_context_files.upsert({
      where: {
        agent_id_file_name: {
          agent_id: memory.agentId,
          file_name: fileName,
        }
      },
      update: {
        content: memory.content,
        updated_at: new Date(),
      },
      create: {
        agent_id: memory.agentId,
        file_name: fileName,
        content: memory.content,
      },
    });
  }
  
  /**
   * Get project context for a task
   */
  async getProjectContext(projectId: string): Promise<string> {
    const project = await prisma.projects.findUnique({
      where: { id: projectId },
    });
    
    if (!project) return '';
    
    return `Project: ${project.name}\nDescription: ${project.description || 'N/A'}`;
  }
  
  /**
   * Get similar past tasks
   */
  async getSimilarTasks(taskId: string, limit: number = 3): Promise<unknown[]> {
    // TODO: Implement semantic similarity search
    return [];
  }
}

// Singleton
export const memoryService = new MemoryService();
