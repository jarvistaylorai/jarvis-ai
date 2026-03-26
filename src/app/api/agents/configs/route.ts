import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const agents = await prisma.agents.findMany({
      where: {
        kind: {
          not: 'human'
        }
      },
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
