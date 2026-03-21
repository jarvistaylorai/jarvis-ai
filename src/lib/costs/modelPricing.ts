export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 0.005, output: 0.015 },
  "claude-3.5-sonnet": { input: 0.003, output: 0.015 },
  "gemini-1.5-flash": { input: 0.0005, output: 0.001 },
};

export function calculateCost(model: string, input: number, output: number) {
  // Try to find exact match or generic matching
  let pricing = MODEL_PRICING[model];
  
  if (!pricing) {
    // Basic fallback matching if exact ID is different
    if (model.includes('gpt-4o')) pricing = MODEL_PRICING["gpt-4o"];
    else if (model.includes('claude-3') || model.includes('sonnet')) pricing = MODEL_PRICING["claude-3.5-sonnet"];
    else if (model.includes('gemini') || model.includes('flash')) pricing = MODEL_PRICING["gemini-1.5-flash"];
  }

  if (!pricing) return 0;

  return (
    (input / 1000) * pricing.input +
    (output / 1000) * pricing.output
  );
}
