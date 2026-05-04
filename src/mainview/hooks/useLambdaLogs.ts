import { useState, useCallback } from "react";
import { rpc } from "../lib/electrobun";
import { cacheGet, cacheSet, cacheDel, cacheList } from "../lib/cache";
import {
  CACHE_FUNCTION_INFO,
  CACHE_LAMBDA_LOG_PREFIX,
  CACHE_LAMBDA_LOG_SESSION,
  DEFAULT_LOG_LIMIT,
  DEFAULT_LOG_WINDOW_MINUTES,
  sessionTimestamp,
} from "../lib/cache-keys";
import { extractErrorMessage } from "../lib/errors";
import type { LogSession } from "../lib/cache-keys";
import type {
  LambdaFunctionInfo,
  LogFetchParams,
  LogFetchResult,
} from "shared/schemas";

interface LogSessionData {
  result: LogFetchResult;
  fetchedAt: string;
  params: LogFetchParams;
}

function defaultTimeRange(windowMinutes: number) {
  const endTime = Date.now();
  const startTime = endTime - windowMinutes * 60_000;
  return { startTime, endTime };
}

export function useLambdaLogs() {
  const [selectedFunction, setSelectedFunction] = useState<string | null>(null);
  const [functionInfo, setFunctionInfo] = useState<LambdaFunctionInfo | null>(null);
  const [logResult, setLogResult] = useState<LogFetchResult | null>(null);
  const [logLoading, setLogLoading] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [logCachedAt, setLogCachedAt] = useState<string | null>(null);
  const [activeLogSessionKey, setActiveLogSessionKey] = useState<string | null>(null);
  const [logSessions, setLogSessions] = useState<LogSession[]>([]);
  const [lastLogParams, setLastLogParams] = useState<LogFetchParams | null>(null);
  const [windowMinutes, setWindowMinutes] = useState(DEFAULT_LOG_WINDOW_MINUTES);
  const [logLimit, setLogLimit] = useState(DEFAULT_LOG_LIMIT);

  const loadFunctionInfo = useCallback(async (functionName: string, seed?: LambdaFunctionInfo) => {
    const cached = await cacheGet<{ info: LambdaFunctionInfo; fetchedAt: string }>(
      CACHE_FUNCTION_INFO(functionName),
    );
    if (cached) {
      setFunctionInfo(cached.info);
      return;
    }
    if (seed) setFunctionInfo(seed);

    try {
      const info = await rpc.request.describeFunction({ functionName });
      setFunctionInfo(info);
      cacheSet(CACHE_FUNCTION_INFO(functionName), {
        info,
        fetchedAt: new Date().toISOString(),
      }).catch(() => {});
    } catch {
      // Non-fatal; listFunctions metadata is enough to browse logs.
    }
  }, []);

  const refreshLogSessionList = useCallback(async (functionName: string) => {
    const keys = await cacheList(CACHE_LAMBDA_LOG_PREFIX(functionName));
    const entries: LogSession[] = [];
    for (const key of keys) {
      const data = await cacheGet<LogSessionData>(key);
      if (data) {
        entries.push({
          cacheKey: key,
          fetchedAt: data.fetchedAt,
          itemCount: data.result.events.length,
          startTime: data.params.startTime,
          endTime: data.params.endTime,
        });
      }
    }
    entries.sort((a, b) => b.fetchedAt.localeCompare(a.fetchedAt));
    setLogSessions(entries);
  }, []);

  const loadLogs = useCallback(async (
    functionName: string,
    range = defaultTimeRange(windowMinutes),
  ) => {
    setLogLoading(true);
    setLogError(null);
    try {
      const params: LogFetchParams = {
        functionName,
        startTime: range.startTime,
        endTime: range.endTime,
        limit: logLimit,
      };
      const response = await rpc.request.fetchLogEvents(params);
      const fetchedAt = new Date().toISOString();
      const sessionKey = CACHE_LAMBDA_LOG_SESSION(functionName, sessionTimestamp());
      setLogResult(response);
      setLogCachedAt(fetchedAt);
      setActiveLogSessionKey(sessionKey);
      setLastLogParams(params);
      await cacheSet(sessionKey, { result: response, fetchedAt, params });
      refreshLogSessionList(functionName);
    } catch (e) {
      setLogError(extractErrorMessage(e));
    } finally {
      setLogLoading(false);
    }
  }, [logLimit, refreshLogSessionList, windowMinutes]);

  const selectFunction = useCallback(async (fn: LambdaFunctionInfo) => {
    setSelectedFunction(fn.functionName);
    setFunctionInfo(fn);
    setLogResult(null);
    setLogError(null);
    setLogCachedAt(null);
    setActiveLogSessionKey(null);
    setLogSessions([]);
    setLastLogParams(null);

    loadFunctionInfo(fn.functionName, fn);

    let loaded = false;
    try {
      const keys = await cacheList(CACHE_LAMBDA_LOG_PREFIX(fn.functionName));
      const newestKey = keys[keys.length - 1];
      if (newestKey) {
        const cached = await cacheGet<LogSessionData>(newestKey);
        if (cached) {
          setLogResult(cached.result);
          setLogCachedAt(cached.fetchedAt);
          setActiveLogSessionKey(newestKey);
          setLastLogParams(cached.params);
          refreshLogSessionList(fn.functionName);
          loaded = true;
        }
      }
    } catch {
      // Cache listing failed; fall through to live fetch.
    }

    if (!loaded) {
      loadLogs(fn.functionName);
    }
  }, [loadFunctionInfo, loadLogs, refreshLogSessionList]);

  const refreshLogs = useCallback(() => {
    if (!selectedFunction) return;
    loadLogs(selectedFunction);
  }, [loadLogs, selectedFunction]);

  const loadNextLogPage = useCallback(async () => {
    if (!selectedFunction || !logResult?.nextToken || !lastLogParams) return;
    setLogLoading(true);
    setLogError(null);
    try {
      const params = {
        ...lastLogParams,
        nextToken: logResult.nextToken,
      };
      const response = await rpc.request.fetchLogEvents(params);
      const seenIds = new Set(logResult.events.map((event) => event.id));
      const newEvents = response.events.filter((event) => !seenIds.has(event.id));
      const merged: LogFetchResult = {
        events: [...logResult.events, ...newEvents],
        groups: response.groups,
        nextToken: response.nextToken,
      };
      const fetchedAt = new Date().toISOString();
      setLogResult(merged);
      setLogCachedAt(fetchedAt);
      setLastLogParams(params);
      if (activeLogSessionKey) {
        cacheSet(activeLogSessionKey, {
          result: merged,
          fetchedAt,
          params,
        }).catch(() => {});
      }
    } catch (e) {
      setLogError(extractErrorMessage(e));
    } finally {
      setLogLoading(false);
    }
  }, [activeLogSessionKey, lastLogParams, logResult, selectedFunction]);

  const loadLogSession = useCallback(async (sessionKey: string) => {
    const cached = await cacheGet<LogSessionData>(sessionKey);
    if (cached) {
      setLogResult(cached.result);
      setLogCachedAt(cached.fetchedAt);
      setActiveLogSessionKey(sessionKey);
      setLastLogParams(cached.params);
    }
  }, []);

  const deleteLogSession = useCallback(async (sessionKey: string) => {
    await cacheDel(sessionKey);
    if (!selectedFunction) return;
    if (activeLogSessionKey === sessionKey) {
      const keys = await cacheList(CACHE_LAMBDA_LOG_PREFIX(selectedFunction));
      const newestKey = keys[keys.length - 1];
      if (newestKey) {
        const cached = await cacheGet<LogSessionData>(newestKey);
        if (cached) {
          setLogResult(cached.result);
          setLogCachedAt(cached.fetchedAt);
          setActiveLogSessionKey(newestKey);
          setLastLogParams(cached.params);
        }
      } else {
        setLogResult(null);
        setLogCachedAt(null);
        setActiveLogSessionKey(null);
        setLastLogParams(null);
      }
    }
    refreshLogSessionList(selectedFunction);
  }, [activeLogSessionKey, refreshLogSessionList, selectedFunction]);

  const resetLambdaLogs = useCallback(() => {
    setSelectedFunction(null);
    setFunctionInfo(null);
    setLogResult(null);
    setLogCachedAt(null);
    setLogError(null);
    setActiveLogSessionKey(null);
    setLogSessions([]);
    setLastLogParams(null);
  }, []);

  return {
    selectedFunction,
    functionInfo,
    logResult,
    logLoading,
    logError,
    logCachedAt,
    activeLogSessionKey,
    logSessions,
    windowMinutes,
    setWindowMinutes,
    logLimit,
    setLogLimit,
    selectFunction,
    refreshLogs,
    loadNextLogPage,
    loadLogSession,
    deleteLogSession,
    resetLambdaLogs,
  };
}
