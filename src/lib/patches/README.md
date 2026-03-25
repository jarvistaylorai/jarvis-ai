# Patch Integration Guide

## Status
Phase 1 emergency patches are **implemented and ready**.

## Integration Points

### 1. Tool Execution Layer
**File:** `src/lib/tools/` (wherever tools are executed)

```typescript
import { summarizeToolOutput } from './outputSummarizer';

// In your tool execution wrapper:
const rawOutput = await executeTool(...);
const summary = summarizeToolOutput(toolName, rawOutput);
return summary.summary; // Not rawOutput
```

### 2. Model Call Layer
**File:** Wherever you call LLM APIs

```typescript
import { pruneConversationHistory } from '../context/conversationPruner';
import { validateContextBudget } from './emergencyPatches';
import { selectModelForRequest } from '../models/quickRouter';

// Before model call:
const prunedMessages = pruneConversationHistory(messages);
const estimatedTokens = estimateTokensFromMessages(prunedMessages);
const { model } = selectModelForRequest(estimatedTokens, taskType);

// Validate budget:
const { content, wasTruncated } = validateContextBudget(
  assemblePrompt(prunedMessages),
  model
);

// Use validated content
```

### 3. Request Pipeline
**File:** Main request handler

```typescript
import { applyEmergencyPatches } from './emergencyPatches';

// Call once at startup:
applyEmergencyPatches();
```

## Quick Validation

Run this in any TypeScript context:

```typescript
import { checkBudget, estimateTokens } from './context/budgetEnforcer';

const bigText = 'x'.repeat(10000);
const status = checkBudget(bigText, 'kimi-k2.5');
console.log(status);
// Should show pressureLevel based on size
```

## Next Steps

1. **Integrate into existing code paths**
2. **Test with real requests**
3. **Monitor logs for `[Emergency Patches]` prefix**
4. **Proceed to Phase 2** when stable