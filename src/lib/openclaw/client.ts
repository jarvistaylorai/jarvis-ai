import OpenAI from "openai"

export const openclaw = new OpenAI({
  apiKey: process.env.OPENCLAW_API_KEY || "placeholder",
  baseURL: process.env.OPENCLAW_BASE_URL || "placeholder",
})
