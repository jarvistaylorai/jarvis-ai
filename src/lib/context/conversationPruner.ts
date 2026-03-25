/**
 * Conversation History Pruning
 * Emergency Patch #3: Limit chat history to prevent unbounded growth
 */

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
}

export interface PruneOptions {
  maxMessages?: number;
  keepSystem?: boolean;
  summarizeThreshold?: number;  // When to summarize instead of prune
}

// Default: Keep last 10 messages (5 exchanges)
const DEFAULT_MAX_MESSAGES = 10;
const DEFAULT_SUMMARIZE_THRESHOLD = 20;

/**
 * Prune conversation history to fit within budget
 * Strategy:
 * 1. Always keep system message (if present)
 * 2. Keep last N messages
 * 3. If history is very long, summarize the middle portion
 */
export function pruneConversationHistory(
  messages: Message[],
  options: PruneOptions = {}
): { messages: Message[]; wasPruned: boolean; summary?: string } {
  const maxMessages = options.maxMessages || DEFAULT_MAX_MESSAGES;
  const keepSystem = options.keepSystem !== false; // Default true
  const summarizeThreshold = options.summarizeThreshold || DEFAULT_SUMMARIZE_THRESHOLD;
  
  // If under limit, return as-is
  if (messages.length <= maxMessages) {
    return { messages, wasPruned: false };
  }
  
  // Find system message
  const systemIndex = messages.findIndex(m => m.role === 'system');
  const systemMessage = systemIndex >= 0 ? messages[systemIndex] : null;
  
  // If very long, use summarization strategy
  if (messages.length > summarizeThreshold) {
    return summarizeMiddle(messages, maxMessages, keepSystem, systemMessage);
  }
  
  // Simple truncation: keep first (system) + last N
  const keepCount = keepSystem && systemMessage ? maxMessages - 1 : maxMessages;
  const lastMessages = messages.slice(-keepCount);
  
  const result: Message[] = [];
  if (keepSystem && systemMessage) {
    result.push(systemMessage);
  }
  result.push(...lastMessages);
  
  return {
    messages: result,
    wasPruned: true,
  };
}

/**
 * Summarize the middle portion of conversation
 * Keep: system message, first 2 exchanges, summary of middle, last 3 exchanges
 */
function summarizeMiddle(
  messages: Message[],
  maxMessages: number,
  keepSystem: boolean,
  systemMessage: Message | null
): { messages: Message[]; wasPruned: boolean; summary: string } {
  const keepFirst = 4;  // 2 exchanges (4 messages)
  const keepLast = 6;   // 3 exchanges (6 messages)
  
  // Calculate middle portion
  const systemOffset = systemMessage ? 1 : 0;
  const middleStart = systemOffset + keepFirst;
  const middleEnd = messages.length - keepLast;
  
  if (middleEnd <= middleStart) {
    // Not enough to summarize, just truncate
    const result = keepSystem && systemMessage 
      ? [systemMessage, ...messages.slice(-(maxMessages - 1))]
      : messages.slice(-maxMessages);
    return { messages: result, wasPruned: true, summary: '' };
  }
  
  // Extract parts
  const firstPart = messages.slice(systemOffset, systemOffset + keepFirst);
  const middlePart = messages.slice(middleStart, middleEnd);
  const lastPart = messages.slice(-keepLast);
  
  // Generate summary of middle (in production, this would be AI-summarized)
  // For now, create a compressed representation
  const userMessages = middlePart.filter(m => m.role === 'user').length;
  const assistantMessages = middlePart.filter(m => m.role === 'assistant').length;
  const toolCalls = middlePart.filter(m => m.role === 'tool').length;
  
  const summary = `[Summary of ${middlePart.length} messages: ${userMessages} user, ${assistantMessages} assistant, ${toolCalls} tool results - detailed content available in memory]`;
  
  const summaryMessage: Message = {
    role: 'system',
    content: summary,
  };
  
  // Build result
  const result: Message[] = [];
  if (keepSystem && systemMessage) {
    result.push(systemMessage);
  }
  result.push(...firstPart);
  result.push(summaryMessage);
  result.push(...lastPart);
  
  return {
    messages: result,
    wasPruned: true,
    summary,
  };
}

/**
 * Calculate conversation statistics
 */
export function getConversationStats(messages: Message[]): {
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  toolMessages: number;
  estimatedTokens: number;
} {
  const userMessages = messages.filter(m => m.role === 'user').length;
  const assistantMessages = messages.filter(m => m.role === 'assistant').length;
  const toolMessages = messages.filter(m => m.role === 'tool').length;
  
  const totalContent = messages.map(m => m.content).join('');
  const estimatedTokens = Math.ceil(totalContent.length / 4);
  
  return {
    totalMessages: messages.length,
    userMessages,
    assistantMessages,
    toolMessages,
    estimatedTokens,
  };
}

/**
 * Log pruning action
 */
export function logPruning(
  originalCount: number,
  newCount: number,
  strategy: string
): void {
  console.log(`[Conversation Pruner] ${originalCount} → ${newCount} messages | Strategy: ${strategy}`);
}

/**
 * Create a rolling window that keeps only last N messages
 * Use this for real-time streaming scenarios
 */
export class RollingWindow {
  private messages: Message[] = [];
  private maxSize: number;
  private keepSystem: boolean;
  
  constructor(maxSize: number = DEFAULT_MAX_MESSAGES, keepSystem: boolean = true) {
    this.maxSize = maxSize;
    this.keepSystem = keepSystem;
  }
  
  add(message: Message): void {
    // Special handling for system messages
    if (message.role === 'system' && this.keepSystem) {
      // Remove existing system message
      this.messages = this.messages.filter(m => m.role !== 'system');
      // Add at beginning
      this.messages.unshift(message);
      return;
    }
    
    this.messages.push(message);
    
    // Prune if over limit
    const systemCount = this.keepSystem ? this.messages.filter(m => m.role === 'system').length : 0;
    const maxNonSystem = this.maxSize - systemCount;
    const nonSystemMessages = this.messages.filter(m => m.role !== 'system');
    
    if (nonSystemMessages.length > maxNonSystem) {
      const toRemove = nonSystemMessages.length - maxNonSystem;
      // Remove oldest non-system messages
      this.messages = [
        ...this.messages.filter(m => m.role === 'system'),
        ...nonSystemMessages.slice(toRemove),
      ];
    }
  }
  
  getMessages(): Message[] {
    return [...this.messages];
  }
  
  clear(): void {
    this.messages = [];
  }
  
  size(): number {
    return this.messages.length;
  }
}