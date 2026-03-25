/**
 * Tool Output Summarization
 * Emergency Patch #2: Truncate tool outputs before they enter context
 */

export interface SummarizeOptions {
  maxTokens?: number;
  strategy?: 'headAndTail' | 'exitCodeAndErrors' | 'relevantSections' | 'extractContent';
  context?: string;
}

export interface SummarizationResult {
  summary: string;
  originalTokens: number;
  summaryTokens: number;
  wasTruncated: boolean;
  compressionRatio: number;
}

// Default settings
const DEFAULT_MAX_TOKENS = 500;

/**
 * Estimate token count from text
 */
function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Summarize tool output based on tool type
 */
export function summarizeToolOutput(
  toolName: string,
  rawOutput: string,
  options: SummarizeOptions = {}
): SummarizationResult {
  const maxTokens = options.maxTokens || DEFAULT_MAX_TOKENS;
  
  // Route to appropriate summarizer
  switch (toolName) {
    case 'read':
      return summarizeFileRead(rawOutput, maxTokens, options);
    case 'exec':
      return summarizeExec(rawOutput, maxTokens, options);
    case 'web_fetch':
      return summarizeWebFetch(rawOutput, maxTokens);
    case 'web_search':
      return summarizeWebSearch(rawOutput, maxTokens);
    default:
      return genericSummarize(rawOutput, maxTokens);
  }
}

/**
 * Summarize file read output
 * For small files: return with line numbers
 * For large files: extract relevant sections
 */
function summarizeFileRead(
  content: string,
  maxTokens: number,
  options: SummarizeOptions
): SummarizationResult {
  const originalTokens = estimateTokens(content);
  
  // If small enough, return with line numbers
  if (originalTokens <= maxTokens) {
    const lines = content.split('\n');
    const numbered = lines.map((line, i) => `${i + 1}: ${line}`).join('\n');
    return {
      summary: numbered,
      originalTokens,
      summaryTokens: estimateTokens(numbered),
      wasTruncated: false,
      compressionRatio: 1,
    };
  }
  
  // For large files: keep first 40% and last 30%, add truncation notice
  const maxChars = maxTokens * 4;
  const keepFirst = Math.floor(maxChars * 0.4);
  const keepLast = Math.floor(maxChars * 0.3);
  
  const firstPart = content.slice(0, keepFirst);
  const lastPart = content.slice(-keepLast);
  const truncatedChars = content.length - keepFirst - keepLast;
  const truncatedTokens = Math.floor(truncatedChars / 4);
  
  const summary = `=== FILE START ===\n${firstPart}\n\n[... ${truncatedTokens} lines truncated ...]\n\n=== FILE END ===\n${lastPart}`;
  
  const summaryTokens = estimateTokens(summary);
  
  return {
    summary,
    originalTokens,
    summaryTokens,
    wasTruncated: true,
    compressionRatio: originalTokens / summaryTokens,
  };
}

/**
 * Summarize exec output
 * Capture: exit code, first 20 lines, error lines, last 30 lines
 */
function summarizeExec(
  output: string,
  maxTokens: number,
  options: SummarizeOptions
): SummarizationResult {
  const originalTokens = estimateTokens(output);
  const lines = output.split('\n');
  
  // Extract exit code (usually in last few lines)
  const exitCodeMatch = output.match(/exit code[:\s]+(\d+)/i);
  const exitCode = exitCodeMatch ? exitCodeMatch[1] : 'unknown';
  
  // Get head (first 20 lines)
  const headLines = lines.slice(0, 20);
  const head = headLines.join('\n');
  
  // Get tail (last 30 lines)
  const tailLines = lines.slice(-30);
  const tail = tailLines.join('\n');
  
  // Extract error lines
  const errorPatterns = ['error', 'Error', 'ERROR', 'FAIL', 'failed', 'exception', 'Exception'];
  const errorLines = lines.filter(line => 
    errorPatterns.some(pattern => line.includes(pattern))
  ).slice(0, 15); // Max 15 error lines
  
  // Build summary
  let summary = `Exit code: ${exitCode}\n\n`;
  summary += `=== HEAD (${headLines.length} lines) ===\n${head}\n\n`;
  
  if (errorLines.length > 0) {
    summary += `=== ERRORS (${errorLines.length} found) ===\n${errorLines.join('\n')}\n\n`;
  }
  
  summary += `=== TAIL (${tailLines.length} lines) ===\n${tail}`;
  
  const summaryTokens = estimateTokens(summary);
  
  // If still too long, truncate further
  if (summaryTokens > maxTokens) {
    const maxChars = maxTokens * 4;
    summary = summary.slice(0, maxChars) + '\n\n[... output truncated due to size ...]';
  }
  
  return {
    summary,
    originalTokens,
    summaryTokens: estimateTokens(summary),
    wasTruncated: true,
    compressionRatio: originalTokens / estimateTokens(summary),
  };
}

/**
 * Summarize web fetch output
 * Extract title, headings, and key paragraphs
 */
function summarizeWebFetch(
  content: string,
  maxTokens: number
): SummarizationResult {
  const originalTokens = estimateTokens(content);
  const maxChars = maxTokens * 4;
  
  // Try to extract title
  const titleMatch = content.match(/#<\s*title[^\u003e]*>([^\u003c]*)<\/title\s*\u003e/i);
  const title = titleMatch ? titleMatch[1].trim() : 'No title found';
  
  // Strip HTML tags for plain text
  const plainText = content
    .replace(/\u003cscript[^\u003e]*\u003e[\s\S]*?\u003c\/script\u003e/gi, '')
    .replace(/\u003cstyle[^\u003e]*\u003e[\s\S]*?\u003c\/style\u003e/gi, '')
    .replace(/\u003c[^\u003e]+\u003e/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Take first portion of plain text
  const excerpt = plainText.slice(0, maxChars * 0.8);
  
  const summary = `Title: ${title}\n\nExcerpt:\n${excerpt}${plainText.length > excerpt.length ? '...' : ''}`;
  
  const summaryTokens = estimateTokens(summary);
  
  return {
    summary,
    originalTokens,
    summaryTokens,
    wasTruncated: plainText.length > excerpt.length,
    compressionRatio: originalTokens / summaryTokens,
  };
}

/**
 * Summarize web search results
 * List titles and snippets, highlight top 3
 */
function summarizeWebSearch(
  content: string,
  maxTokens: number
): SummarizationResult {
  const originalTokens = estimateTokens(content);
  const maxChars = maxTokens * 4;
  
  // Try to extract results
  const results: Array<{ title: string; snippet: string; url?: string }> = [];
  
  // Simple pattern matching for common formats
  const resultMatches = content.match(/\d+\.\s+([^\n]+)/g);
  if (resultMatches) {
    resultMatches.slice(0, 10).forEach((match, i) => {
      results.push({
        title: match.replace(/^\d+\.\s*/, ''),
        snippet: '',
      });
    });
  }
  
  // Build summary
  let summary = `Search Results (${results.length} found):\n\n`;
  
  results.slice(0, 8).forEach((result, i) => {
    summary += `${i + 1}. ${result.title}\n`;
    if (result.snippet) {
      summary += `   ${result.snippet}\n`;
    }
    summary += '\n';
  });
  
  if (results.length > 8) {
    summary += `[${results.length - 8} more results...]`;
  }
  
  const summaryTokens = estimateTokens(summary);
  
  return {
    summary,
    originalTokens,
    summaryTokens,
    wasTruncated: results.length > 8,
    compressionRatio: originalTokens / summaryTokens,
  };
}

/**
 * Generic summarization for unknown tools
 * Keep first 40% and last 30%
 */
function genericSummarize(
  content: string,
  maxTokens: number
): SummarizationResult {
  const originalTokens = estimateTokens(content);
  const maxChars = maxTokens * 4;
  
  if (originalTokens <= maxTokens) {
    return {
      summary: content,
      originalTokens,
      summaryTokens: originalTokens,
      wasTruncated: false,
      compressionRatio: 1,
    };
  }
  
  const keepFirst = Math.floor(maxChars * 0.4);
  const keepLast = Math.floor(maxChars * 0.3);
  
  const firstPart = content.slice(0, keepFirst);
  const lastPart = content.slice(-keepLast);
  const truncatedTokens = originalTokens - estimateTokens(firstPart) - estimateTokens(lastPart);
  
  const summary = `${firstPart}\n\n[... ${truncatedTokens} tokens truncated ...]\n\n${lastPart}`;
  const summaryTokens = estimateTokens(summary);
  
  return {
    summary,
    originalTokens,
    summaryTokens,
    wasTruncated: true,
    compressionRatio: originalTokens / summaryTokens,
  };
}

/**
 * Log summarization for debugging
 */
export function logSummarization(
  toolName: string,
  result: SummarizationResult
): void {
  console.log(`[Tool Summarizer] ${toolName} | Original: ${result.originalTokens} tokens | Summary: ${result.summaryTokens} tokens | Ratio: ${result.compressionRatio.toFixed(2)}x | Truncated: ${result.wasTruncated}`);
}