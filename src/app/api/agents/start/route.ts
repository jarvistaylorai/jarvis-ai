import { NextResponse } from "next/server"
import { startAgent } from "@/lib/agents/agentManager"

export async function POST(req: Request) {
  try {
    const { agentId } = await req.json()
    if (!agentId) return NextResponse.json({ error: "Missing agentId parameter" }, { status: 400 })

    startAgent(agentId)
    return NextResponse.json({ success: true, message: `Agent ${agentId} autonomous loop started` })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
