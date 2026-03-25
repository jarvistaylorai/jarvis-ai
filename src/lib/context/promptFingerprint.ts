import crypto from 'crypto';

export interface PromptFingerprints {
  systemHash?: string;
  instructionHash?: string;
  conversationHash?: string;
  memoryHash?: string;
  taskHash?: string;
  userHash?: string;
  finalHash: string;
  layerHashes: Record<string, string>;
}

export interface FingerprintLayer {
  name: string;
  content: string;
}

function normalizeLine(line: string): string {
  const trimmed = line.trimEnd();
  if (/^(timestamp|generated_at|updated_at)\s*[:=]/i.test(trimmed)) {
    return '';
  }
  return trimmed;
}

export function normalizeBlock(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(normalizeLine)
    .filter(Boolean)
    .join('\n')
    .trim();
}

export function hashNormalized(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export function computePromptFingerprints(
  layers: FingerprintLayer[],
  userMessage: string,
  assembledPrompt: string
): PromptFingerprints {
  const layerHashes: Record<string, string> = {};

  for (const layer of layers) {
    if (!layer.content) continue;
    const normalized = normalizeBlock(layer.content);
    if (!normalized) continue;
    const hash = hashNormalized(normalized);
    layerHashes[layer.name] = hash;
  }

  const systemHash = layerHashes['system'];
  const taskHash = layerHashes['task'];
  const memoryHash = layerHashes['memory'];
  const conversationHash = layerHashes['conversation'];
  const instructionHash = systemHash; // Placeholder until dedicated instruction block exists
  const userHash = hashNormalized(normalizeBlock(userMessage));
  const finalHash = hashNormalized(normalizeBlock(assembledPrompt));

  return {
    systemHash,
    instructionHash,
    conversationHash,
    memoryHash,
    taskHash,
    userHash,
    finalHash,
    layerHashes,
  };
}
