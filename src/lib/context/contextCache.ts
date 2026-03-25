interface LayerCacheEntry {
  fingerprint: string;
  tokens: number;
  lastUsed: number;
  agentId?: string;
}

interface LayerMetrics {
  hits: number;
  misses: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;

class ContextCache {
  private caches = new Map<string, Map<string, LayerCacheEntry>>();
  private metrics = new Map<string, LayerMetrics>();

  register(layerName: string, fingerprint: string, tokens: number, agentId?: string): {
    reused: boolean;
  } {
    const now = Date.now();
    if (!this.caches.has(layerName)) {
      this.caches.set(layerName, new Map());
    }
    if (!this.metrics.has(layerName)) {
      this.metrics.set(layerName, { hits: 0, misses: 0 });
    }

    const layerCache = this.caches.get(layerName)!;
    // Purge expired entries lazily
    for (const [key, entry] of layerCache) {
      if (now - entry.lastUsed > CACHE_TTL_MS) {
        layerCache.delete(key);
      }
    }

    const metrics = this.metrics.get(layerName)!;
    const existing = layerCache.get(fingerprint);
    if (existing) {
      existing.lastUsed = now;
      existing.tokens = tokens;
      metrics.hits += 1;
      return { reused: true };
    }

    layerCache.set(fingerprint, { fingerprint, tokens, lastUsed: now, agentId });
    metrics.misses += 1;
    return { reused: false };
  }

  getMetrics(): Record<string, LayerMetrics> {
    const result: Record<string, LayerMetrics> = {};
    for (const [layer, val] of this.metrics) {
      result[layer] = { ...val };
    }
    return result;
  }
}

export const contextCache = new ContextCache();
