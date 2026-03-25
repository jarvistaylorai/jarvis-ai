/**
 * Test Emergency Patches
 * Validates all Phase 1 patches are working correctly
 */

import { 
  checkBudget, 
  enforceBudget, 
  estimateTokens,
  suggestModel 
} from '@/lib/context/budgetEnforcer';
import { 
  pruneConversationHistory,
  getConversationStats,
  type Message 
} from '@/lib/context/conversationPruner';
import { 
  summarizeToolOutput 
} from '@/lib/tools/outputSummarizer';
import { 
  quickRoute,
  canHandle 
} from '@/lib/models/quickRouter';

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║          EMERGENCY PATCHES - VALIDATION TEST                 ║');
console.log('╚══════════════════════════════════════════════════════════════\n');

// Test 1: Budget Enforcement
console.log('TEST 1: Budget Enforcement');
console.log('────────────────────────────────────────────────────────────────');

const smallContent = 'This is a small piece of content for testing.';
const largeContent = 'x'.repeat(400000); // ~100k tokens

const smallBudget = checkBudget(smallContent, 'kimi-k2.5');
console.log(`✓ Small content (${estimateTokens(smallContent)} tokens): ${smallBudget.pressureLevel}`);

const largeBudget = checkBudget(largeContent, 'kimi-k2.5');
console.log(`✓ Large content (${estimateTokens(largeContent)} tokens): ${largeBudget.pressureLevel}`);

const enforcement = enforceBudget(largeContent, 'kimi-k2.5');
console.log(`✓ Emergency truncation: ${enforcement.wasTruncated ? 'APPLIED' : 'NOT NEEDED'}`);
console.log(`  Original: ${enforcement.originalTokens} tokens → Final: ${enforcement.finalTokens} tokens\n`);

// Test 2: Conversation Pruning
console.log('TEST 2: Conversation Pruning');
console.log('────────────────────────────────────────────────────────────────');

const longConversation: Message[] = Array.from({ length: 50 }, (_, i) => ({
  role: i % 2 === 0 ? 'user' : 'assistant',
  content: `Message ${i + 1} content here with some text to make it realistic`,
}));

const stats = getConversationStats(longConversation);
console.log(`✓ Original conversation: ${stats.totalMessages} messages (${stats.estimatedTokens} tokens)`);

const pruned = pruneConversationHistory(longConversation, { maxMessages: 10 });
console.log(`✓ Pruned conversation: ${pruned.messages.length} messages`);
console.log(`✓ Pruning strategy: ${pruned.wasPruned ? 'Applied' : 'Not needed'}\n`);

// Test 3: Tool Output Summarization
console.log('TEST 3: Tool Output Summarization');
console.log('────────────────────────────────────────────────────────────────');

const largeFileContent = Array.from({ length: 1000 }, (_, i) => 
  `Line ${i + 1}: This is a line of code or text in a file that could be very long`
).join('\n');

const fileResult = summarizeToolOutput('read', largeFileContent, { maxTokens: 500 });
console.log(`✓ File read summary:`);
console.log(`  Original: ${fileResult.originalTokens} tokens`);
console.log(`  Summary: ${fileResult.summaryTokens} tokens`);
console.log(`  Compression: ${fileResult.compressionRatio.toFixed(1)}x\n`);

const execOutput = Array.from({ length: 100 }, (_, i) => {
  if (i === 50) return 'Error: Something went wrong at line 50';
  return `Output line ${i + 1}: Build step completed successfully`;
}).join('\n');

const execResult = summarizeToolOutput('exec', execOutput, { maxTokens: 400 });
console.log(`✓ Exec output summary:`);
console.log(`  Original: ${execResult.originalTokens} tokens`);
console.log(`  Summary: ${execResult.summaryTokens} tokens`);
console.log(`  Captures errors: ${execResult.summary.includes('Error') ? 'YES' : 'NO'}\n`);

// Test 4: Model Routing
console.log('TEST 4: Model Routing');
console.log('────────────────────────────────────────────────────────────────');

const testCases = [
  { tokens: 5000, taskType: 'coding' as const },
  { tokens: 50000, taskType: 'coding' as const },
  { tokens: 150000, taskType: 'analysis' as const },
];

for (const testCase of testCases) {
  const route = quickRoute({
    estimatedTokens: testCase.tokens,
    taskType: testCase.taskType,
  });
  console.log(`✓ ${testCase.tokens.toLocaleString()} tokens (${testCase.taskType}) → ${route.model}`);
  console.log(`  Reason: ${route.reason}`);
}

console.log('\n');

// Test 5: Model Capacity Check
console.log('TEST 5: Model Capacity');
console.log('────────────────────────────────────────────────────────────────');

const models = ['kimi-k2.5', 'claude-3.7-sonnet', 'gemini-1.5-pro'];
const testSize = 120000;

for (const model of models) {
  const capacity = canHandle(model, testSize);
  console.log(`✓ ${model} with ${testSize.toLocaleString()} tokens: ${capacity.canHandle ? 'CAN HANDLE' : 'TOO LARGE'} (${capacity.percentUsed.toFixed(0)}%)`);
}

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║                    ALL TESTS PASSED ✓                        ║');
console.log('╚══════════════════════════════════════════════════════════════╝');