import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const agents = await prisma.agent.findMany({
      include: {
        agent_model_config: {
          include: {
            primary_model: true,
            fallback_model: true
          }
        }
      }
    });
    
    return NextResponse.json(agents);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch agent configs" }, { status: 500 });
  }
}
