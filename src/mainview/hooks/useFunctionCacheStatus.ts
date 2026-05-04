import { useState, useEffect, useCallback } from "react";
import { cacheList } from "../lib/cache";
import { CACHE_LAMBDA_LOG_PREFIX } from "../lib/cache-keys";
import type { LambdaFunctionInfo } from "shared/schemas";

export function useFunctionCacheStatus(functions: LambdaFunctionInfo[]) {
  const [functionsWithCache, setFunctionsWithCache] = useState<Set<string>>(new Set());

  const refreshCacheStatus = useCallback(async () => {
    if (functions.length === 0) {
      setFunctionsWithCache((prev) => (prev.size === 0 ? prev : new Set()));
      return;
    }

    try {
      const checks = functions.map(async (fn) => {
        const keys = await cacheList(CACHE_LAMBDA_LOG_PREFIX(fn.functionName));
        return { functionName: fn.functionName, hasCached: keys.length > 0 };
      });

      const results = await Promise.all(checks);
      const next = new Set<string>();
      for (const { functionName, hasCached } of results) {
        if (hasCached) next.add(functionName);
      }

      setFunctionsWithCache((prev) => {
        if (prev.size === next.size && [...next].every((fn) => prev.has(fn))) return prev;
        return next;
      });
    } catch {
      // Best-effort indicator only.
    }
  }, [functions]);

  useEffect(() => {
    refreshCacheStatus();
  }, [refreshCacheStatus]);

  return { functionsWithCache, refreshCacheStatus };
}
