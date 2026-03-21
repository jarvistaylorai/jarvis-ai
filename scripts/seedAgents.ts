import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Clear existing
  await prisma.agent.deleteMany({});
  
  await prisma.agent.createMany({
    data: [
      {
        id: "jarvis",
        name: "Jarvis",
        role: "Chief Intelligence System",
        description: "Orchestrates all agents, manages execution flow, delegates tasks, and maintains system-wide awareness.",
        capabilities: JSON.stringify(["Orchestration", "Decision-Making", "Task Delegation", "System Monitoring"]),
        status: "active",
        load: "normal",
        layer: "core"
      },
      {
        id: "charlie",
        name: "Charlie",
        role: "Infrastructure Engineer",
        description: "Infrastructure and automation specialist.",
        capabilities: JSON.stringify(["Coding", "Infrastructure", "Automation"]),
        status: "idle",
        load: "normal",
        layer: "infrastructure"
      },
      {
        id: "ralph",
        name: "Ralph",
        role: "Foreman / QA Manager",
        description: "Checks the work, signs off or sends it back. No-nonsense quality control.",
        capabilities: JSON.stringify(["Quality Assurance", "Monitoring", "Recording"]),
        status: "idle",
        load: "low",
        layer: "infrastructure"
      },
      {
        id: "scout",
        name: "Scout",
        role: "Trend Analyst",
        description: "Finds leads, tracks signals, scouts opportunities out in the wild.",
        capabilities: JSON.stringify(["Speed", "Radar", "Intuition"]),
        status: "active",
        load: "normal",
        layer: "input"
      },
      {
        id: "quill",
        name: "Quill",
        role: "Content Writer",
        description: "Writes copy, designs content, ensures voice consistency.",
        capabilities: JSON.stringify(["Voice", "Quality", "Design"]),
        status: "active",
        load: "normal",
        layer: "processing"
      },
      {
        id: "pixel",
        name: "Pixel",
        role: "Thumbnail Designer",
        description: "Designs thumbnails, crafts visuals, keeps aesthetics high.",
        capabilities: JSON.stringify(["Visual", "Attention", "Style"]),
        status: "idle",
        load: "low",
        layer: "output"
      },
      {
        id: "echo",
        name: "Echo",
        role: "Social Media Manager",
        description: "Posts, engages, grows the audience on all platforms.",
        capabilities: JSON.stringify(["Viral", "Speed", "Reach"]),
        status: "active",
        load: "high",
        layer: "output"
      },
      {
        id: "codex",
        name: "Codex",
        role: "Lead Engineer",
        description: "Builds, fixes, automates. The quiet one who makes everything actually work.",
        capabilities: JSON.stringify(["Code", "Systems", "Reliability"]),
        status: "idle",
        load: "normal",
        layer: "meta"
      },
      {
        id: "violet",
        name: "Violet",
        role: "Research Analyst",
        description: "Deep research and analysis specialist.",
        capabilities: JSON.stringify(["Research", "Analysis", "Trends"]),
        status: "idle",
        load: "normal",
        layer: "meta"
      }
    ]
  })
  
  console.log("Seeded agents successfully.")
}

main().catch(console.error)
