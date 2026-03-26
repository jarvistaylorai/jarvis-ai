import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const rules = await prisma.model_routing_rule.findMany({
      orderBy: { priority: "desc" }
    });
    return NextResponse.json(rules);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch routing rules" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const rule = await prisma.model_routing_rule.create({
      data: {
        task_type: data.task_type,
        model_id: data.model_id,
        priority: data.priority || 0
      }
    });
    return NextResponse.json(rule);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create routing rule" }, { status: 500 });
  }
}
