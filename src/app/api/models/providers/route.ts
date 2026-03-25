import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const providers = await prisma.provider_settings.findMany();
    return NextResponse.json(providers);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch providers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const provider = await prisma.provider_settings.upsert({
      where: { provider: data.provider },
      update: {
        api_key: data.api_key,
        status: data.status,
      },
      create: {
        provider: data.provider,
        api_key: data.api_key,
        status: data.status || "disconnected",
      }
    });
    return NextResponse.json(provider);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update provider" }, { status: 500 });
  }
}
