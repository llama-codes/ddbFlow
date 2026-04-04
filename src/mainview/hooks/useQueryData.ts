import { useState, useCallback } from "react";
import { rpc } from "../lib/electrobun";
import { cacheGet, cacheSet, cacheDel, cacheList } from "../lib/cache";
import {
  CACHE_QUERY_PREFIX,
  CACHE_QUERY_SESSION,
  sessionTimestamp,
} from "../lib/cache-keys";
import { extractErrorMessage } from "../lib/errors";
import type { QuerySession, QuerySessionMeta } from "../lib/cache-keys";
import type { QueryParams, QueryResult, TableInfo } from "shared/schemas";

export function useQueryData(
  selectedTable: string | null,
  tableInfo: TableInfo | null,
  scanLimit: number,
) {
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [queryCachedAt, setQueryCachedAt] = useState<string | null>(null);

  const [activeQuerySessionKey, setActiveQuerySessionKey] = useState<string | null>(null);
  const [querySessions, setQuerySessions] = useState<QuerySession[]>([]);
  const [lastQueryParams, setLastQueryParams] = useState<QueryParams | null>(null);
  const [lastQueryMeta, setLastQueryMeta] = useState<QuerySessionMeta | null>(null);

  const refreshQuerySessionList = useCallback(async (tableName: string) => {
    const keys = await cacheList(CACHE_QUERY_PREFIX(tableName));
    const entries: QuerySession[] = [];
    for (const key of keys) {
      const data = await cacheGet<{
        result: QueryResult;
        fetchedAt: string;
        queryParams: QuerySessionMeta;
      }>(key);
      if (data) {
        entries.push({
          cacheKey: key,
          fetchedAt: data.fetchedAt,
          itemCount: data.result.count,
          queryParams: data.queryParams,
        });
      }
    }
    entries.sort((a, b) => b.fetchedAt.localeCompare(a.fetchedAt));
    setQuerySessions(entries);
  }, []);

  const executeQuery = useCallback(
    async (params: QueryParams, meta: QuerySessionMeta) => {
      if (!selectedTable) return;
      setQueryLoading(true);
      setQueryError(null);
      try {
        const response = await rpc.request.query(params);
        const fetchedAt = new Date().toISOString();
        const ts = sessionTimestamp();
        const sessionKey = CACHE_QUERY_SESSION(selectedTable, ts);
        setQueryResult(response);
        setQueryCachedAt(fetchedAt);
        setActiveQuerySessionKey(sessionKey);
        setLastQueryParams(params);
        setLastQueryMeta(meta);
        await cacheSet(sessionKey, { result: response, fetchedAt, queryParams: meta });
        refreshQuerySessionList(selectedTable);
      } catch (e) {
        setQueryError(extractErrorMessage(e));
      } finally {
        setQueryLoading(false);
      }
    },
    [selectedTable, refreshQuerySessionList],
  );

  const loadNextQueryPage = useCallback(async () => {
    if (!selectedTable || !queryResult?.lastEvaluatedKey || !lastQueryParams) return;
    setQueryLoading(true);
    setQueryError(null);
    try {
      const response = await rpc.request.query({
        ...lastQueryParams,
        exclusiveStartKey: queryResult.lastEvaluatedKey,
      });
      const merged: QueryResult = {
        ...response,
        items: [...queryResult.items, ...response.items],
        count: queryResult.count + response.count,
        scannedCount: queryResult.scannedCount + response.scannedCount,
      };
      const fetchedAt = new Date().toISOString();
      setQueryResult(merged);
      setQueryCachedAt(fetchedAt);
      if (activeQuerySessionKey && lastQueryMeta) {
        cacheSet(activeQuerySessionKey, {
          result: merged,
          fetchedAt,
          queryParams: lastQueryMeta,
        }).catch(() => {});
      }
    } catch (e) {
      setQueryError(extractErrorMessage(e));
    } finally {
      setQueryLoading(false);
    }
  }, [selectedTable, queryResult, lastQueryParams, lastQueryMeta, activeQuerySessionKey]);

  const loadQuerySession = useCallback(async (sessionKey: string) => {
    const cached = await cacheGet<{
      result: QueryResult;
      fetchedAt: string;
      queryParams: QuerySessionMeta;
    }>(sessionKey);
    if (cached) {
      setQueryResult(cached.result);
      setQueryCachedAt(cached.fetchedAt);
      setActiveQuerySessionKey(sessionKey);
      setLastQueryMeta(cached.queryParams);
    }
  }, []);

  const deleteQuerySession = useCallback(
    async (sessionKey: string) => {
      await cacheDel(sessionKey);
      if (selectedTable) {
        if (activeQuerySessionKey === sessionKey) {
          const keys = await cacheList(CACHE_QUERY_PREFIX(selectedTable));
          const newestKey = keys[keys.length - 1];
          if (newestKey) {
            const cached = await cacheGet<{
              result: QueryResult;
              fetchedAt: string;
              queryParams: QuerySessionMeta;
            }>(newestKey);
            if (cached) {
              setQueryResult(cached.result);
              setQueryCachedAt(cached.fetchedAt);
              setActiveQuerySessionKey(newestKey);
              setLastQueryMeta(cached.queryParams);
            }
          } else {
            setQueryResult(null);
            setQueryCachedAt(null);
            setActiveQuerySessionKey(null);
            setLastQueryMeta(null);
          }
        }
        refreshQuerySessionList(selectedTable);
      }
    },
    [activeQuerySessionKey, selectedTable, refreshQuerySessionList],
  );

  const restoreQuerySessions = useCallback(
    async (tableName: string) => {
      try {
        const keys = await cacheList(CACHE_QUERY_PREFIX(tableName));
        const newestKey = keys[keys.length - 1];
        if (newestKey) {
          refreshQuerySessionList(tableName);
          const cached = await cacheGet<{
            result: QueryResult;
            fetchedAt: string;
            queryParams: QuerySessionMeta;
          }>(newestKey);
          if (cached) {
            setQueryResult(cached.result);
            setQueryCachedAt(cached.fetchedAt);
            setActiveQuerySessionKey(newestKey);
            setLastQueryMeta(cached.queryParams);
          }
        }
      } catch {
        /* cache listing failed */
      }
    },
    [refreshQuerySessionList],
  );

  const resetQueryData = useCallback(() => {
    setQueryResult(null);
    setQueryCachedAt(null);
    setQueryError(null);
    setActiveQuerySessionKey(null);
    setQuerySessions([]);
    setLastQueryParams(null);
    setLastQueryMeta(null);
  }, []);

  return {
    queryResult,
    queryLoading,
    queryError,
    queryCachedAt,
    activeQuerySessionKey,
    querySessions,
    executeQuery,
    loadNextQueryPage,
    loadQuerySession,
    deleteQuerySession,
    restoreQuerySessions,
    resetQueryData,
  };
}
