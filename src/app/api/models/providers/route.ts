import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const dbProviders = await prisma.provider_settings.findMany();
    
    // Check environment variables for keys
    const envProviders: unknown[] = [];
    if (process.env.OPENAI_API_KEY || process.env.OPENAI_ADMIN_KEY) {
      envProviders.push({ provider: 'openai', status: 'connected' });
    }
    if (process.env.ANTHROPIC_API_KEY) {
      envProviders.push({ provider: 'anthropic', status: 'connected' });
    }
    if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY) {
      envProviders.push({ provider: 'google', status: 'connected' });
    }

    // Merge database providers with env providers
    const providers = [...dbProviders];
    
    for (const envProv of envProviders) {
      const existingIdx = providers.findIndex(p => p.provider === envProv.provider);
      if (existingIdx >= 0) {
        // Only override status if not already connected in DB
        if (providers[existingIdx].status !== 'connected') {
          providers[existingIdx] = { ...providers[existingIdx], status: 'connected' };
        }
      } else {
        providers.push({
          id: `env-${envProv.provider}`,
          provider: envProv.provider,
          api_key: 'env_var_secret',
          status: envProv.status
        });
      }
    }

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
