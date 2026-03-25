import { instrumentation } from "../openclaw/instrumentation"
import { openclaw } from "../openclaw/client"
import { getSystemState, updateSystemState } from "../system/state"
import { executeToolCall as originalExecuteToolCall } from "../tools/executeTool"
import { buildSystemPrompt } from "./prompt"
import { wrapToolExecution, pruneMessages, quickRoute, estimateTokens, executePatchedOpenClawRequest } from "@/lib/patches/integration"
import { queueRequest } from "@/lib/ai/requestQueue"
import { safeModelCall } from "@/lib/ai/safeModelCall"
import { emitDigest, flushDigests, withDigest } from "@/lib/messaging/digest"
import { render as renderTemplate } from "@/lib/messaging/templates"
import { MessageClass } from "@/lib/messaging/constants"

const agentLocks = new Set<string>()

// Apply Phase 1 Patch: Tool output summarization
const executeToolCall = wrapToolExecution(originalExecuteToolCall)

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Activity logging with digest aggregation
 * Collapses repetitive status messages into concise updates
 */
async function logActivity(agent: any, message: any) {
  const state = await getSystemState()
  const timestamp = new Date().toISOString()

  // Emit to digest instead of immediate logging
  if (message.tool_calls) {
    for (const call of message.tool_calls) {
      emitDigest(MessageClass.STATUS_UPDATE, `Tool: ${call.function.name}`, {
        operation: 'tool_call',
        agentId: agent.id,
        taskId: agent.current_task_id,
        entityId: agent.id,
        tool: call.function.name,
        timestamp,
      })
    }
    
    // Update state activity log (internal, not user-facing)
    if (!Array.isArray(state.activity)) state.activity = []
    state.activity.push({
      agent_id: agent.id,
      event: "tool_call",
      tool_count: message.tool_calls.length,
      timestamp
    })
  } else if (message.content) {
    // Determine if this is a substantive message or just chatter
    const isSubstantive = message.content.length > 100 || 
                          message.content.includes('completed') ||
                          message.content.includes('error') ||
                          message.content.includes('result');
    
    if (isSubstantive) {
      emitDigest(MessageClass.EXECUTION_RESULT, message.content.substring(0, 200), {
        operation: 'agent_output',
        agentId: agent.id,
        taskId: agent.current_task_id,
        entityId: agent.id,
        contentLength: message.content.length,
        timestamp,
      })
    } else {
      // Collapse short status messages
      emitDigest(MessageClass.STATUS_UPDATE, 'Working...', {
        operation: 'status',
        agentId: agent.id,
        taskId: agent.current_task_id,
        entityId: agent.id,
        timestamp,
      })
    }

    if (!Array.isArray(state.activity)) state.activity = []
    state.activity.push({
      agent_id: agent.id,
      event: "message",
      content_preview: message.content.substring(0, 100),
      timestamp
    })
  }

  await updateSystemState("activity.json", state.activity)

  // Instrumentation for telemetry (internal tracking)
  if (message.content) {
    instrumentation.logMessage(agent.id, message.content, agent.current_task_id, {
      isDigest: true,
      originalLength: message.content.length
    })
  } else if (message.tool_calls) {
    instrumentation.logMessage(agent.id, `Executed ${message.tool_calls.length} tool calls`, agent.current_task_id, {
      tools: message.tool_calls.map((c: any) => c.function.name),
      isDigest: true
    })
  }
}

function getToolDefinitions(agent: any) {
  return [
    {
      type: "function",
      function: {
        name: "write_file",
        description: "Write content to a file in the workspace",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "Path relative to workspace" },
            content: { type: "string" }
          },
          required: ["path", "content"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "read_file",
        description: "Read content from a file in the workspace",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string" }
          },
          required: ["path"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "list_directory",
        description: "List files in a directory",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string" }
          },
          required: ["path"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "create_task",
        description: "Create a new task",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" }
          },
          required: ["title"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "update_task",
        description: "Update task status or details",
        parameters: {
          type: "object",
          properties: {
            id: { type: "string" },
            status: { type: "string" },
            steps: { type: "array", items: { type: "string" } }
          },
          required: ["id"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "assign_task",
        description: "Assign a task to an agent",
        parameters: {
          type: "object",
          properties: {
            taskId: { type: "string" },
            agentId: { type: "string" }
          },
          required: ["taskId", "agentId"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "run_command",
        description: "Run a terminal command",
        parameters: {
          type: "object",
          properties: {
            command: { type: "string" }
          },
          required: ["command"]
        }
      }
    }
  ]
}

export async function runAgent(agentId: string) {
  let lastTaskId: string | null = null;
  let lastCompletedId: string | null = null;
  let loopCount = 0;
  let lastDigestFlush = Date.now();
  
  instrumentation.agentStatus(agentId, "active")

  // Emit agent start via template
  emitDigest(MessageClass.STATUS_UPDATE, renderTemplate.taskStarted({ taskId: agentId }).content, {
    operation: 'agent_start',
    agentId,
    entityId: agentId,
  })

  while (true) {
    loopCount++
    const state = await getSystemState()

    const agent = state.agents?.find((a: any) => a.id === agentId)
    // End execution if agent goes inactive or gets deleted
    if (!agent || agent.status !== "active") {
      // Flush any pending digests before exiting
      const digests = flushDigests()
      if (digests.length > 0) {
        console.log(`[Agent ${agentId}] Final digests:`, digests.map(d => d.content).join(' | '))
      }
      
      emitDigest(MessageClass.STATUS_UPDATE, renderTemplate.completed({ 
        taskId: agentId, 
        elapsedMs: 0 
      }).content, {
        operation: 'agent_stop',
        agentId,
        entityId: agentId,
        reason: agent ? 'inactive' : 'deleted'
      })
      
      instrumentation.agentStatus(agentId, "offline")
      break
    }

    const task = state.tasks?.find((t: any) => t.id === agent.current_task_id)
    if (!task) {
      // Flush digests before stopping
      const digests = flushDigests()
      if (digests.length > 0) {
        console.log(`[Agent ${agentId}] Final digests:`, digests.map(d => d.content).join(' | '))
      }
      
      console.log(`[Agent ${agentId}] No assigned task. Stopping loop.`)
      instrumentation.agentStatus(agentId, "idle")
      break
    }

    // Keep track of the current task to emit start/complete events
    if (lastTaskId !== task.id) {
      emitDigest(MessageClass.STATUS_UPDATE, renderTemplate.taskStarted({ taskId: task.id }).content, {
        operation: 'task_start',
        agentId: agent.id,
        taskId: task.id,
        entityId: task.id,
      })
      instrumentation.taskStarted(agent.id, task.id, task.project_id)
      lastTaskId = task.id
    }

    if (task.status === "completed" && lastCompletedId !== task.id) {
      emitDigest(MessageClass.EXECUTION_RESULT, renderTemplate.completed({ 
        taskId: task.id,
        elapsedMs: Date.now() - (task.started_at ? new Date(task.started_at).getTime() : Date.now())
      }).content, {
        operation: 'task_complete',
        agentId: agent.id,
        taskId: task.id,
        entityId: task.id,
      })
      
      instrumentation.taskCompleted(agent.id, task.id, task.project_id)
      lastCompletedId = task.id
    }

    // Periodic digest flush (every 10 seconds)
    if (Date.now() - lastDigestFlush > 10000) {
      const digests = flushDigests()
      if (digests.length > 0) {
        console.log(`[Agent ${agentId}] Progress:`, digests.map(d => d.content).join(' | '))
      }
      lastDigestFlush = Date.now()
    }

    try {
      // Build conversation history from previous messages if available
      const conversationHistory = state.conversation_history || []
      
      // Apply Phase 1 Patch: Conversation pruning (keep last 10 messages)
      const { messages: prunedMessages, wasPruned } = pruneMessages(conversationHistory, { maxMessages: 10 })
      
      if (wasPruned) {
        emitDigest(MessageClass.STATUS_UPDATE, `Context pruned: ${prunedMessages.length} msgs`, {
          operation: 'context_prune',
          agentId,
          entityId: agentId,
          originalCount: conversationHistory.length,
          prunedCount: prunedMessages.length,
        })
      }

      if (agentLocks.has(agent.id)) {
        await sleep(3000)
        continue
      }

      agentLocks.add(agent.id)

      // Wrap execution in digest context
      const result = await withDigest(
        'model_call',
        `${agent.id}:${task.id}:${loopCount}`,
        () => queueRequest(() =>
          safeModelCall(
            () => executePatchedOpenClawRequest({
              agentId: agent.id,
              taskId: task.id,
              model: agent.model,
              messages: [
                ...prunedMessages,
                { role: 'user', content: task.description || task.title || "Begin execution of the assigned task." }
              ],
              tools: getToolDefinitions(agent),
              workspaceId: agent.workspace_id
            }, openclaw),
            { label: `agent:${agent.id}` }
          )
        )
      )

      const message = {
        content: result.content,
        tool_calls: result.toolCalls
      }

      // Log model routing and budget status via digest
      if (result.wasRouted) {
        emitDigest(MessageClass.STATUS_UPDATE, renderTemplate.downgradedModel({
          fromModel: result.originalModel,
          toModel: result.modelUsed
        }).content, {
          operation: 'model_route',
          agentId,
          taskId: task.id,
          entityId: agent.id,
          routingReason: result.routingReason,
        })
      }
      
      if (result.budgetStatus.pressureLevel !== 'low') {
        emitDigest(MessageClass.STATUS_UPDATE, renderTemplate.budgetThreshold({
          threshold: result.budgetStatus.pressureLevel,
          currentSpend: `${result.budgetStatus.percentUsed.toFixed(0)}%`,
          limit: '100%'
        }).content, {
          operation: 'budget_warning',
          agentId,
          taskId: task.id,
          entityId: agent.id,
          pressureLevel: result.budgetStatus.pressureLevel,
          percentUsed: result.budgetStatus.percentUsed,
        })
      }

      if (result.toolCalls) {
        for (const call of result.toolCalls) {
          // Phase 1 Patch: Tool output automatically summarized via wrapToolExecution
          await executeToolCall(call, agent)
        }
      }

      await logActivity(agent, message)
      
    } catch (e: any) {
      emitDigest(MessageClass.ERROR_RECOVERY, renderTemplate.failed({
        taskId: task.id,
        errorCode: e.name || 'AGENT_ERROR',
        recoveryAction: 'Check logs and retry'
      }).content, {
        operation: 'error',
        agentId: agent.id,
        taskId: task.id,
        entityId: agent.id,
        error: e.message,
      })
      
      console.error(`[Agent ${agentId}] Error in loop:`, e)
      instrumentation.agentError(agentId, e, agent.current_task_id)
    } finally {
      agentLocks.delete(agent.id)
    }

    await sleep(3000)
  }
  
  // Final flush of any remaining digests
  const finalDigests = flushDigests()
  if (finalDigests.length > 0) {
    console.log(`[Agent ${agentId}] Final summary:`, finalDigests.map(d => d.content).join(' | '))
  }
}

/**
 * Run agent with digest aggregation
 * Returns aggregated status updates instead of individual messages
 */
export async function runAgentWithDigest(agentId: string): Promise<string[]> {
  const results: string[] = []
  
  // Override console.log for this run to capture digests
  const originalLog = console.log
  console.log = (...args: any[]) => {
    const message = args.join(' ')
    if (message.includes('[Agent') && message.includes('Progress:')) {
      results.push(message.replace(/.*Progress: /, ''))
    }
    originalLog.apply(console, args)
  }
  
  try {
    await runAgent(agentId)
  } finally {
    console.log = originalLog
  }
  
  return results
}
