import { PrismaClient, agent_kind, agent_status, task_status, task_priority, task_type, telemetry_category, telemetry_severity } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');
  const workspaceId = process.env.SEED_WORKSPACE_ID || '636a86e5-b364-4417-b347-d27f332cf204';
  
  // ==========================================
  // 1. SYSTEM & RUNTIME CONFIG
  // ==========================================
  console.log('⚙️ Seeding System Config...');
  await prisma.systemState.upsert({
    where: { id: 'global' },
    update: {
      status: 'NORMAL',
      last_evaluated_at: new Date().toISOString()
    },
    create: {
      id: 'global',
      workspace: 'business',
      status: 'NORMAL',
      active_agents: 6,
      pending_tasks: 6,
      blocked_tasks: 0,
      last_evaluated_at: new Date().toISOString()
    }
  });

  await prisma.spendLimit.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      global_daily_limit: 50.0,
      per_agent_limit: 10.0,
      per_task_limit: 2.0,
      per_model_limit: 20.0
    }
  });

  // ==========================================
  // 2. AGENTS (CONTROL PLANE)
  // ==========================================
  console.log('🤖 Seeding Agents...');
  
  const agentsData = [
    {
      handle: 'orchestrator',
      name: 'Main Orchestrator',
      role: 'System Coordination & Task Routing',
      kind: agent_kind.autonomous,
      status: agent_status.active,
      capability_tags: ['routing', 'planning', 'supervision']
    },
    {
      handle: 'memory-agent',
      name: 'Memory Agent',
      role: 'Retrieval & Context Structuring',
      kind: agent_kind.service,
      status: agent_status.idle,
      capability_tags: ['rag', 'vector-search', 'summarization']
    },
    {
      handle: 'context-agent',
      name: 'Context Agent',
      role: 'Runtime Injection & Trimming',
      kind: agent_kind.service,
      status: agent_status.idle,
      capability_tags: ['token-management', 'context-window']
    },
    {
      handle: 'dev-agent',
      name: 'Dev Agent',
      role: 'Code Synthesis & Refactoring',
      kind: agent_kind.autonomous,
      status: agent_status.idle,
      capability_tags: ['typescript', 'react', 'python', 'git']
    },
    {
      handle: 'research-agent',
      name: 'Research Agent',
      role: 'Information Gathering & Synthesis',
      kind: agent_kind.autonomous,
      status: agent_status.idle,
      capability_tags: ['web-search', 'scraping', 'analysis']
    },
    {
      handle: 'ops-agent',
      name: 'Ops Agent',
      role: 'System Telemetry & Cost Control',
      kind: agent_kind.service,
      status: agent_status.active,
      capability_tags: ['monitoring', 'metrics', 'cost-analysis']
    }
  ];

  const agentDocs = [];
  for (const a of agentsData) {
    // Generate deterministic UUID based on handle
    // For idempotency, we query by handle (wait, handle isn't unique in schema. It's just a string, no @unique)
    // We will query by workspace_id + handle to find existing.
    let existing = await prisma.agents.findFirst({
      where: { workspace_id: workspaceId, handle: a.handle }
    });

    if (!existing) {
      existing = await prisma.agents.create({
        data: {
          workspace_id: workspaceId,
          ...a,
          metadata: { initial_seed: true }
        }
      });
    } else {
      existing = await prisma.agents.update({
        where: { id: existing.id },
        data: { ...a }
      });
    }
    agentDocs.push(existing);
  }

  const orchestrator = agentDocs.find(a => a.handle === 'orchestrator');
  const opsAgent = agentDocs.find(a => a.handle === 'ops-agent');
  const memAgent = agentDocs.find(a => a.handle === 'memory-agent');

  // ==========================================
  // 3. TASKS
  // ==========================================
  console.log('📋 Seeding Starter Tasks...');
  
  const tasksData = [
    {
      title: 'Verify DB connectivity',
      description: 'Ensure Prisma can connect to Supabase backend successfully and read/write records.',
      status: task_status.completed,
      priority: task_priority.critical,
      type: task_type.maintenance,
      tags: ['core', 'db'],
      assigned_agent_id: opsAgent?.id
    },
    {
      title: 'Assemble context pipeline',
      description: 'Implement /api/context/assemble to properly format system and user context strings.',
      status: task_status.in_progress,
      priority: task_priority.high,
      type: task_type.action,
      tags: ['runtime', 'api'],
      assigned_agent_id: orchestrator?.id
    },
    {
      title: 'Enable memory retrieval',
      description: 'Wire up the /api/memory/retrieve endpoint to fetch relevant semantic records from agent_context_files.',
      status: task_status.pending,
      priority: task_priority.high,
      type: task_type.action,
      tags: ['rag', 'api'],
      assigned_agent_id: memAgent?.id
    },
    {
      title: 'Validate dashboard live state',
      description: 'Connect dashboard hooks to actual DB metrics instead of hardcoded mocks.',
      status: task_status.pending,
      priority: task_priority.normal,
      type: task_type.action,
      tags: ['ui', 'dashboard'],
      assigned_agent_id: devAgentId(agentDocs)
    },
    {
      title: 'Confirm spend telemetry path',
      description: 'Ensure spend logs accurately capture token usage through the metrics aggregator.',
      status: task_status.ideas,
      priority: task_priority.low,
      type: task_type.research,
      tags: ['telemetry', 'cost'],
      assigned_agent_id: opsAgent?.id
    },
    {
      title: 'Bootstrap orchestration loop',
      description: 'Start the main background scheduling loop for autonomous assignment.',
      status: task_status.ideas,
      priority: task_priority.normal,
      type: task_type.action,
      tags: ['sys', 'core'],
      assigned_agent_id: orchestrator?.id
    }
  ];

  function devAgentId(docs: any[]) {
    return docs.find(a => a.handle === 'dev-agent')?.id;
  }

  for (const t of tasksData) {
    const existing = await prisma.tasks.findFirst({
      where: { workspace_id: workspaceId, title: t.title }
    });
    
    if (!existing) {
      await prisma.tasks.create({
        data: {
          workspace_id: workspaceId,
          ...t,
          metadata: { initial_seed: true }
        }
      });
    } else {
      await prisma.tasks.update({
        where: { id: existing.id },
        data: { ...t }
      });
    }
  }

  // ==========================================
  // 4. ACTIVITY / EVENT LOG
  // ==========================================
  console.log('📉 Seeding Telemetry & Events...');
  
  const existingBootLog = await prisma.telemetry_events.findFirst({
    where: { 
      workspace_id: workspaceId, 
      category: telemetry_category.event, 
      event_type: 'SYSTEM_BOOT_INIT' 
    }
  });

  if (!existingBootLog) {
    await prisma.telemetry_events.createMany({
      data: [
         {
          workspace_id: workspaceId,
          category: telemetry_category.event,
          severity: telemetry_severity.info,
          event_type: 'SYSTEM_BOOT_INIT',
          message: 'Jarvis System Boot initialized.',
          payload: { version: '0.1.0' },
          agent_id: orchestrator?.id
         },
         {
          workspace_id: workspaceId,
          category: telemetry_category.log,
          severity: telemetry_severity.info,
          event_type: 'DB_SYNC',
          message: 'Prisma schema and seeded baseline state synchronized.',
          agent_id: opsAgent?.id
         },
         {
          workspace_id: workspaceId,
          category: telemetry_category.event,
          severity: telemetry_severity.info,
          event_type: 'AGENTS_READY',
          message: 'Control plane agents spawned and idle.',
          agent_id: orchestrator?.id
         }
      ]
    });
  }
  
  // ==========================================
  // 5. BASELINE MEMORY & CONTEXT
  // ==========================================
  console.log('🧠 Seeding Knowledge Context Files...');
  
  let canonicalMemoryContent = 'Jarvis Agents must prioritize memory retrieval over raw generation. If a task requires domain knowledge, always consult the context pipeline first before making architectural decisions.';
  try {
    const memoryRootPath = path.join(process.cwd(), 'MEMORY.md');
    if (fs.existsSync(memoryRootPath)) {
      canonicalMemoryContent = fs.readFileSync(memoryRootPath, 'utf8');
      console.log('  Loaded canonical MEMORY.md from disk.');
    }
  } catch (e) {
    console.warn('  Failed to load physical MEMORY.md, using fallback content.');
  }

  const memoriesData = [
    {
      agent_id: orchestrator?.id,
      file_name: 'MEMORY.md',
      content: canonicalMemoryContent
    },
    {
      agent_id: memAgent?.id,
      file_name: 'memory_retrieval_policy.md',
      content: 'Semantic retrieval must return a minimum score of 0.7 to be considered relevant. Documents scored below 0.7 must be actively pruned to maintain context budget integrity during assembly.'
    },
    {
      agent_id: opsAgent?.id,
      file_name: 'context_budget_policy.md',
      content: 'The default token budget per orchestration step is 8192 tokens. Avoidable spend must be aggressively minimized by utilizing summarization functions and passing verbosity flags.'
    },
    {
      agent_id: orchestrator?.id,
      file_name: 'dashboard_interpretation.md',
      content: 'The mission control dashboard surfaces active agent load, task bottlenecks, and telemetry events in real-time. When system status reads OVERLOADED, pause secondary batch tasks.'
    }
  ];

  for (const m of memoriesData) {
    if (!m.agent_id) continue;
    await prisma.agent_context_files.upsert({
      where: {
        agent_id_file_name: {
          agent_id: m.agent_id,
          file_name: m.file_name
        }
      },
      update: { content: m.content },
      create: {
        agent_id: m.agent_id,
        file_name: m.file_name,
        content: m.content
      }
    });
  }

  console.log('✅ Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ SEED ERROR:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
