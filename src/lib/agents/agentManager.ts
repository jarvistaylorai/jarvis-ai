import { runAgent } from "./runAgent"

const activeLoops = new Map<string, Promise<void>>()

export function startAgent(agentId: string) {
  if (activeLoops.has(agentId)) return

  console.log(`Starting execution loop for agent ${agentId}`)
  const loop = runAgent(agentId)
  activeLoops.set(agentId, loop)
}

export function stopAgent(agentId: string) {
  console.log(`Stopping execution loop for agent ${agentId}`)
  activeLoops.delete(agentId)
}
