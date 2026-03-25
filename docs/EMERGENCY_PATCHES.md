# Emergency Patches - Phase 1

**Applied:** 2026-03-21  
**Purpose:** Stop context window overflows immediately  
**Status:** ✅ Active

---

## What Was Applied

### Patch 1: Tool Output Summarization
**File:** `src/lib/tools/outputSummarizer.ts`

**Problem:** Full tool outputs (file reads, exec results) were being dumped into prompts, consuming thousands of tokens.

**Solution:** All tool outputs are now summarized before entering the context:
- File reads: First 40% + last 30% with line numbers
- Exec output: Exit code + head (20 lines) + errors + tail (30 lines)
- Web fetch: Title + excerpt
- Web search: List of titles
- Default: First 40% + last 30%

**Max Output:** 500 tokens (800 for file reads)

**Usage:**
```typescript
import { summarizeToolOutput } from '@/lib/tools/outputSummarizer';

const result = summarizeToolOutput('read', fileContent, { maxTokens: 500 });
// Use result.summary in prompt, not rawOutput
```

---

### Patch 2: Conversation History Pruning
**File:** `src/lib/context/conversationPruner.ts`

**Problem:** Full chat history accumulated linearly, eventually exceeding context limits.

**Solution:** Conversation history is pruned to last 10 messages (5 exchanges) before each model call.

**Strategy:**
- Keep system message (if present)
- Keep last 10 messages
- If history exceeds 20 messages, summarize the middle portion

**Usage:**
```typescript
import { pruneConversationHistory } from '@/lib/context/conversationPruner';

const pruned = pruneConversationHistory(messages, { maxMessages: 10 });
// Use pruned.messages for model call
```

---

### Patch 3: Context Budget Enforcement
**File:** `src/lib/context/budgetEnforcer.ts`

**Problem:** No hard limits on prompt size, leading to context overflow crashes.

**Solution:** Strict token budgets enforced per model:
- Kimi: 100,000 tokens (leaves 28k for output)
- Claude Sonnet/Opus: 180,000 tokens
- Gemini Pro: 800,000 tokens

**Features:**
- Token estimation (1 token ≈ 4 characters)
- Budget status checking
- Emergency truncation (keep first 30% + last 20% + notice)
- Model suggestion based on token count

**Usage:**
```typescript
import { checkBudget, enforceBudget } from '@/lib/context/budgetEnforcer';

// Check if within budget
const status = checkBudget(prompt, 'kimi-k2.5');
if (!status.withinBudget) {
  // Emergency truncate
  const { content } = enforceBudget(prompt, 'kimi-k2.5');
}
```

---

### Patch 4: Quick Model Router
**File:** `src/lib/models/quickRouter.ts`

**Problem:** All tasks were using one model, regardless of size or complexity.

**Solution:** Automatic model routing based on token estimate:
- < 8k tokens → Kimi (fast, cheap)
- 8k - 100k tokens + coding → Claude Sonnet (best coding)
- > 100k tokens → Gemini Pro (massive context)

**Routing Rules:**
1. Tiny tasks → Kimi
2. Coding tasks < 80k → Claude
3. Code review < 80k → Claude
4. Architecture → Claude Opus
5. Large context > 80k → Gemini
6. Cost sensitive < 16k → Kimi

**Usage:**
```typescript
import { quickRoute } from '@/lib/models/quickRouter';

const result = quickRoute({
  estimatedTokens: 50000,
  taskType: 'coding',
});
// result.model = 'claude-3.7-sonnet'
```

---

### Patch 5: Disable Auto File Injection
**Config:** `config/contextBudget.json`

**Problem:** Workspace files were being automatically injected into every prompt.

**Solution:** Files must now be explicitly requested:
```json
{
  "fileLoading": {
    "autoInject": false,
    "requireExplicitRequest": true,
    "maxFileSizeKb": 500,
    "maxTotalFiles": 5
  }
}
```

**Before:** Files auto-loaded  
**After:** Files retrieved on-demand only

---

### Patch 6: HEARTBEAT Throttling
**Config:** `config/contextBudget.json`

**Problem:** HEARTBEAT.md was being read every cycle, wasting tokens.

**Solution:** Read throttled to 5-minute intervals:
```json
{
  "heartbeat": {
    "readIntervalMinutes": 5,
    "maxSizeTokens": 500,
    "summarizeIfLarger": true
  }
}
```

---

## API Endpoints

### POST /api/context/assemble
Assembles context with budget enforcement.

**Request:**
```json
{
  "agentId": "jarvis",
  "taskId": "task_123",
  "userMessage": "Refactor the auth system",
  "conversationHistory": [...],
  "model": "kimi-k2.5"
}
```

**Response:**
```json
{
  "systemPrompt": "...",
  "taskContext": "...",
  "recentConversation": "...",
  "retrievedMemories": [],
  "toolResults": [],
  "historicalSummary": "",
  "fileExcerpts": [],
  "metadata": {
    "totalTokens": 8500,
    "budgetTokens": 100000,
    "percentUsed": 8,
    "pressureLevel": "low",
    "model": "kimi-k2.5",
    "wasTruncated": false
  }
}
```

---

## Quick Start

### Apply All Patches
```typescript
import { applyEmergencyPatches } from '@/lib/patches/emergencyPatches';

// Call once at app startup
applyEmergencyPatches();
```

### Use in Tool Execution
```typescript
import { processToolResult } from '@/lib/patches/emergencyPatches';

// In your tool handler
const toolResult = await executeTool(...);
const { summary } = processToolResult('read', toolResult.rawOutput);
// Use summary in context, not rawOutput
```

### Use Before Model Call
```typescript
import { 
  processConversationHistory,
  validateContextBudget,
  selectModelForRequest 
} from '@/lib/patches/emergencyPatches';

// 1. Prune conversation
const prunedMessages = processConversationHistory(messages);

// 2. Select appropriate model
const { model } = selectModelForRequest(estimatedTokens, 'coding');

// 3. Validate budget
const validation = validateContextBudget(fullPrompt, model);
if (!validation.isValid) {
  console.warn('Context truncated:', validation.recommendedModel);
}
```

---

## Expected Impact

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Avg Prompt Size | ~80k tokens | ~15k tokens | **81% reduction** |
| Kimi Crashes | Frequent | Rare | **~95% reduction** |
| Tool Output Tokens | 5k-10k | 500 | **90% reduction** |
| Conversation Growth | Linear | Bounded | **Fixed** |
| File Auto-Injection | Yes | No | **Security + Efficiency** |

---

## Monitoring

Watch for these log patterns:

```
[Tool Summarizer] read | Original: 5000 tokens | Summary: 450 tokens | Ratio: 11x
[Conversation Pruner] 25 → 10 messages | Strategy: rolling window
[Context Budget] kimi-k2.5 | MEDIUM | 65% used | Context: validation
[Model Router] coding | 45000 tokens → claude-3.7-sonnet | Reason: Coding task
```

---

## Next Steps (Phase 2)

1. **Implement full ContextAssemblyService** with 7-layer system
2. **Build MemoryService** with pgvector for semantic retrieval
3. **Create Mission Control UI** for context monitoring
4. **Add structured operational state** to replace HEARTBEAT.md
5. **Implement document indexing** for on-demand file retrieval

---

## Rollback

If issues arise, patches can be disabled by:
1. Not calling `applyEmergencyPatches()`
2. Setting `autoInject: true` in config
3. Removing tool output summarization calls

All patches are additive and don't modify existing code paths unless explicitly called.

---

## Support

For issues or questions, check:
- Logs for `[Emergency Patches]` prefix
- `/api/context/assemble` endpoint for debugging
- `config/contextBudget.json` for configuration

---

**Document Version:** 1.0  
**Last Updated:** 2026-03-21