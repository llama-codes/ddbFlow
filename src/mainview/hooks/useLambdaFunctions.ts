import { useState, useCallback } from "react";
import { rpc } from "../lib/electrobun";
import { cacheGet, cacheSet } from "../lib/cache";
import { CACHE_FUNCTIONS } from "../lib/cache-keys";
import { extractErrorMessage } from "../lib/errors";
import type { LambdaFunctionInfo } from "shared/schemas";

export function useLambdaFunctions() {
  const [functions, setFunctions] = useState<LambdaFunctionInfo[]>([]);
  const [functionsLoading, setFunctionsLoading] = useState(false);
  const [functionsError, setFunctionsError] = useState<string | null>(null);
  const [functionsCachedAt, setFunctionsCachedAt] = useState<string | null>(null);

  const loadFunctions = useCallback(async () => {
    setFunctionsLoading(true);
    setFunctionsError(null);
    try {
      const response = await rpc.request.listFunctions({});
      const fetchedAt = new Date().toISOString();
      setFunctions(response);
      setFunctionsCachedAt(fetchedAt);
      cacheSet(CACHE_FUNCTIONS, { functions: response, fetchedAt }).catch(() => {});
      rpc.send.log({ msg: `listFunctions returned ${response.length} functions` });
    } catch (e) {
      setFunctionsError(extractErrorMessage(e));
    } finally {
      setFunctionsLoading(false);
    }
  }, []);

  const restoreFunctionsFromCache = useCallback(async () => {
    const cached = await cacheGet<{ functions: LambdaFunctionInfo[]; fetchedAt: string }>(CACHE_FUNCTIONS);
    if (cached) {
      setFunctions(cached.functions);
      setFunctionsCachedAt(cached.fetchedAt);
      return true;
    }
    return false;
  }, []);

  const resetFunctions = useCallback(() => {
    setFunctions([]);
    setFunctionsCachedAt(null);
  }, []);

  return {
    functions,
    functionsLoading,
    functionsError,
    functionsCachedAt,
    loadFunctions,
    restoreFunctionsFromCache,
    resetFunctions,
  };
}
