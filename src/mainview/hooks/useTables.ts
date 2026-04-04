/**
 * Manages the DynamoDB tables list shown in the sidebar.
 *
 * State: table names, loading/error flags, and cache timestamp.
 * Actions: loadTables (fetch from AWS), restoreTablesFromCache, resetTables.
 */
import { useState, useCallback } from "react";
import { rpc } from "../lib/electrobun";
import { cacheGet, cacheSet } from "../lib/cache";
import { CACHE_TABLES } from "../lib/cache-keys";
import { extractErrorMessage } from "../lib/errors";

export function useTables() {
  const [tables, setTables] = useState<string[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [tablesError, setTablesError] = useState<string | null>(null);
  const [tablesCachedAt, setTablesCachedAt] = useState<string | null>(null);

  const loadTables = useCallback(async () => {
    setTablesLoading(true);
    setTablesError(null);
    try {
      const response = await rpc.request.listTables({});
      const fetchedAt = new Date().toISOString();
      setTables(response);
      setTablesCachedAt(fetchedAt);
      cacheSet(CACHE_TABLES, { tables: response, fetchedAt }).catch(() => {});
      rpc.send.log({ msg: `listTables returned ${response.length} tables` });
    } catch (e) {
      setTablesError(extractErrorMessage(e));
    } finally {
      setTablesLoading(false);
    }
  }, []);

  const restoreTablesFromCache = useCallback(async () => {
    const cached = await cacheGet<{ tables: string[]; fetchedAt: string }>(CACHE_TABLES);
    if (cached) {
      setTables(cached.tables);
      setTablesCachedAt(cached.fetchedAt);
      return true;
    }
    return false;
  }, []);

  const resetTables = useCallback(() => {
    setTables([]);
    setTablesCachedAt(null);
  }, []);

  return {
    tables,
    tablesLoading,
    tablesError,
    tablesCachedAt,
    loadTables,
    restoreTablesFromCache,
    resetTables,
  };
}
