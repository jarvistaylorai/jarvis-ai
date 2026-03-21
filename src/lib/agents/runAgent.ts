import { openclaw } from "../openclaw/client"
import { getSystemState, updateSystemState } from "../system/state"
import { executeToolCall } from "../tools/executeTool"
import { buildSystemPrompt } from "./prompt"

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function logActivity(agent: any, message: any) {
  const state = await getSystemState()
  const timestamp = new Date().toISOString()
  
  if (message.tool_calls) {
    for (const call of message.tool_calls) {
      if (!Array.isArray(state.activity)) state.activity = []
      state.activity.push({
        agent_id: agent.id,
        event: "tool_call",
        tool: call.function.name,
        arguments: call.function.arguments,
        timestamp
      })
    }
  } else if (message.content) {
      if (!Array.isArray(state.activity)) state.activity = []
      state.activity.push({
        agent_id: agent.id,
        event: "message",
        content: message.content,
        timestamp
      })
  }

  await updateSystemState("activity.json", state.activity)
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
  while (true) {
    const state = await getSystemState()

    const agent = state.agents?.find((a: any) => a.id === agentId)
    // End execution if agent goes inactive or gets deleted
    if (!agent || agent.status !== "active") break

    const task = state.tasks?.find((t: any) => t.id === agent.current_task_id)
    if (!task) {
      await sleep(2000)
      continue
    }

    try {
      const response = await openclaw.chat.completions.create({
        model: agent.model || "gpt-5", // From requirements
        messages: [
          {
            role: "system",
            content: buildSystemPrompt(agent, state)
          },
          {
            role: "user",
            content: task.description || task.title || "Begin execution of the assigned task."
          }
        ],
        tools: getToolDefinitions(agent) as any
      })

      const message = response.choices[0].message

      if (message.tool_calls) {
        for (const call of message.tool_calls) {
          await executeToolCall(call, agent)
        }
      }

      await logActivity(agent, message)
      
    } catch (e) {
      console.error(`[Agent ${agentId}] Error in loop:`, e)
    }

    await sleep(2000)
  }
}
