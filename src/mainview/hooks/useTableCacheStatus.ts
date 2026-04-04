import { useState, useEffect, useCallback } from "react";
import { cacheList } from "../lib/cache";
import { CACHE_SCAN_PREFIX, CACHE_QUERY_PREFIX } from "../lib/cache-keys";

export function useTableCacheStatus(tables: string[]) {
  const [tablesWithCache, setTablesWithCache] = useState<Set<string>>(new Set());

  const refreshCacheStatus = useCallback(async () => {
    if (tables.length === 0) {
      setTablesWithCache((prev) => (prev.size === 0 ? prev : new Set()));
      return;
    }

    try {
      const checks = tables.map(async (table) => {
        const [scanKeys, queryKeys] = await Promise.all([
          cacheList(CACHE_SCAN_PREFIX(table)),
          cacheList(CACHE_QUERY_PREFIX(table)),
        ]);
        return { table, hasCached: scanKeys.length > 0 || queryKeys.length > 0 };
      });

      const results = await Promise.all(checks);
      const next = new Set<string>();
      for (const { table, hasCached } of results) {
        if (hasCached) next.add(table);
      }

      setTablesWithCache((prev) => {
        if (prev.size === next.size && [...next].every((t) => prev.has(t))) return prev;
        return next;
      });
    } catch {
      // silent — show no indicators rather than break UI
    }
  }, [tables]);

  useEffect(() => {
    refreshCacheStatus();
  }, [refreshCacheStatus]);

  return { tablesWithCache, refreshCacheStatus };
}
