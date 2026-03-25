export const WORKSPACE_MAPPING: Record<string, string> = {
  'business': '636a86e5-b364-4417-b347-d27f332cf204',
  'personal': 'f053229b-a01c-4b36-b605-c19eb209c314',
};

export function getWorkspaceId(ws: string | null | undefined): string {
  if (!ws) return WORKSPACE_MAPPING['business'];
  const lowered = ws.toLowerCase();
  return WORKSPACE_MAPPING[lowered] || WORKSPACE_MAPPING['business'];
}

// Deprecated string fallback for compatibility if required
export const DEFAULT_WORKSPACE_STRING = 'business';
