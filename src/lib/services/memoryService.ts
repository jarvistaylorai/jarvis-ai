/**
 * Memory Service
 * Phase 2: Semantic memory retrieval with pgvector
 */

import { PrismaClient } from '@prisma/client';

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
  metadata: Record<string, any>;
}

export class MemoryService {
  
  /**
   * Retrieve relevant memories based on semantic similarity
   */
  async retrieve(query: MemoryQuery): Promise<RetrievedMemory[]> {
    // TODO: Generate embedding for query
    // const queryEmbedding = await this.embed(query.query);
    
    // For now, return keyword-based results
    const results = await prisma.$queryRaw`
      SELECT id, type, content, 
             ts_rank(to_tsvector('english', content), plainto_tsquery('english', ${query.query})) as score
      FROM memory_entries
      WHERE workspace_id = 'business'
        AND (${query.projectId}::text IS NULL OR project_id = ${query.projectId})
        AND (${query.taskId}::text IS NULL OR task_id = ${query.taskId})
        AND (${query.agentId}::text IS NULL OR agent_id = ${query.agentId})
        AND (${query.types ? prisma.$queryRaw`type = ANY(${query.types})` : prisma.$queryRaw`TRUE`})
      ORDER BY score DESC
      LIMIT ${query.limit || 5}
    `;
    
    return (results as any[]).map(r => ({
      id: r.id,
      type: r.type,
      content: r.content,
      score: r.score,
      metadata: {},
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
    metadata?: Record<string, any>;
  }): Promise<void> {
    // TODO: Generate embedding
    // const embedding = await this.embed(memory.content);
    
    await prisma.memoryEntry.create({
      data: {
        content: memory.content,
        type: memory.type,
        agentId: memory.agentId,
        projectId: memory.projectId,
        taskId: memory.taskId,
        workspaceId: 'business',
        metadata: memory.metadata || {},
        // embedding: embedding, // Requires pgvector
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
  async getSimilarTasks(taskId: string, limit: number = 3): Promise<any[]> {
    // TODO: Implement semantic similarity search
    return [];
  }
}

// Singleton
export const memoryService = new MemoryService();
