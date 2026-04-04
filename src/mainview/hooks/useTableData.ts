/**
 * Manages everything related to viewing a selected table's data.
 *
 * Owns: selected table, schema (describeTable), scan results, pagination,
 * and cached scan sessions (timestamped snapshots).
 *
 * Accepts `scanLimit` from useSettings to control items per scan request.
 *
 * Key actions:
 *  - selectTable: clears state, loads schema, restores newest session or fetches fresh
 *  - refreshScan: creates a new scan session without deleting old ones
 *  - loadNextScanPage: appends next page to current session
 *  - loadSession / deleteSession: switch between or remove cached sessions
 */
import { useState, useCallback } from "react";
import { rpc } from "../lib/electrobun";
import { cacheGet, cacheSet, cacheDel, cacheList } from "../lib/cache";
import {
  CACHE_SCHEMA,
  CACHE_SCAN_PREFIX,
  CACHE_SCAN_SESSION,
  sessionTimestamp,
} from "../lib/cache-keys";
import { extractErrorMessage } from "../lib/errors";
import type { ScanSession } from "../lib/cache-keys";
import type { QueryResult, TableInfo } from "shared/schemas";

export function useTableData(scanLimit: number) {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null);

  const [scanResult, setScanResult] = useState<QueryResult | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanCachedAt, setScanCachedAt] = useState<string | null>(null);

  const [activeScanSessionKey, setActiveScanSessionKey] = useState<string | null>(null);
  const [scanSessions, setScanSessions] = useState<ScanSession[]>([]);

  const loadSchema = useCallback(async (tableName: string) => {
    const cached = await cacheGet<{ info: TableInfo; fetchedAt: string }>(CACHE_SCHEMA(tableName));
    if (cached) { setTableInfo(cached.info); return; }
    try {
      const info = await rpc.request.describeTable({ tableName });
      setTableInfo(info);
      cacheSet(CACHE_SCHEMA(tableName), { info, fetchedAt: new Date().toISOString() }).catch(() => {});
    } catch { /* non-fatal */ }
  }, []);

  const refreshSessionList = useCallback(async (tableName: string) => {
    const keys = await cacheList(CACHE_SCAN_PREFIX(tableName));
    const entries: ScanSession[] = [];
    for (const key of keys) {
      const data = await cacheGet<{ result: QueryResult; fetchedAt: string }>(key);
      if (data) {
        entries.push({ cacheKey: key, fetchedAt: data.fetchedAt, itemCount: data.result.count });
      }
    }
    entries.sort((a, b) => b.fetchedAt.localeCompare(a.fetchedAt));
    setScanSessions(entries);
  }, []);

  const loadScan = useCallback(async (tableName: string) => {
    setScanLoading(true);
    setScanError(null);
    try {
      const response = await rpc.request.scan({ tableName, limit: scanLimit });
      const fetchedAt = new Date().toISOString();
      const ts = sessionTimestamp();
      const sessionKey = CACHE_SCAN_SESSION(tableName, ts);
      setScanResult(response);
      setScanCachedAt(fetchedAt);
      setActiveScanSessionKey(sessionKey);
      await cacheSet(sessionKey, { result: response, fetchedAt });
      refreshSessionList(tableName);
    } catch (e) {
      setScanError(extractErrorMessage(e));
    } finally {
      setScanLoading(false);
    }
  }, [refreshSessionList, scanLimit]);

  const loadNextScanPage = useCallback(async () => {
    if (!selectedTable || !scanResult?.lastEvaluatedKey) return;
    setScanLoading(true);
    setScanError(null);
    try {
      const response = await rpc.request.scan({
        tableName: selectedTable,
        limit: scanLimit,
        exclusiveStartKey: scanResult.lastEvaluatedKey,
      });
      const merged = scanResult ? {
        ...response,
        items: [...scanResult.items, ...response.items],
        count: scanResult.count + response.count,
        scannedCount: scanResult.scannedCount + response.scannedCount,
      } : response;
      const fetchedAt = new Date().toISOString();
      setScanResult(merged);
      setScanCachedAt(fetchedAt);
      if (activeScanSessionKey) {
        cacheSet(activeScanSessionKey, { result: merged, fetchedAt }).catch(() => {});
      }
    } catch (e) {
      setScanError(extractErrorMessage(e));
    } finally {
      setScanLoading(false);
    }
  }, [selectedTable, scanResult, activeScanSessionKey, scanLimit]);

  const selectTable = useCallback(async (tableName: string) => {
    setSelectedTable(tableName);
    setTableInfo(null);
    setScanResult(null);
    setScanError(null);
    setScanCachedAt(null);
    setActiveScanSessionKey(null);
    setScanSessions([]);

    loadSchema(tableName);

    let loaded = false;
    try {
      const keys = await cacheList(CACHE_SCAN_PREFIX(tableName));
      const newestKey = keys[keys.length - 1];
      if (newestKey) {
        const cached = await cacheGet<{ result: QueryResult; fetchedAt: string }>(newestKey);
        if (cached) {
          setScanResult(cached.result);
          setScanCachedAt(cached.fetchedAt);
          setActiveScanSessionKey(newestKey);
          refreshSessionList(tableName);
          loaded = true;
        }
      }
    } catch { /* cache listing failed */ }

    if (!loaded) {
      loadScan(tableName);
    }
  }, [loadScan, loadSchema, refreshSessionList]);

  const refreshScan = useCallback(() => {
    if (!selectedTable) return;
    setScanCachedAt(null);
    loadScan(selectedTable);
  }, [selectedTable, loadScan]);

  const loadSession = useCallback(async (sessionKey: string) => {
    const cached = await cacheGet<{ result: QueryResult; fetchedAt: string }>(sessionKey);
    if (cached) {
      setScanResult(cached.result);
      setScanCachedAt(cached.fetchedAt);
      setActiveScanSessionKey(sessionKey);
    }
  }, []);

  const deleteSession = useCallback(async (sessionKey: string) => {
    await cacheDel(sessionKey);
    if (selectedTable) {
      if (activeScanSessionKey === sessionKey) {
        const keys = await cacheList(CACHE_SCAN_PREFIX(selectedTable));
        const newestKey = keys[keys.length - 1];
        if (newestKey) {
          const cached = await cacheGet<{ result: QueryResult; fetchedAt: string }>(newestKey);
          if (cached) {
            setScanResult(cached.result);
            setScanCachedAt(cached.fetchedAt);
            setActiveScanSessionKey(newestKey);
          }
        } else {
          setScanResult(null);
          setScanCachedAt(null);
          setActiveScanSessionKey(null);
          loadScan(selectedTable);
        }
      }
      refreshSessionList(selectedTable);
    }
  }, [activeScanSessionKey, selectedTable, refreshSessionList, loadScan]);

  const resetTableData = useCallback(() => {
    setSelectedTable(null);
    setTableInfo(null);
    setScanResult(null);
    setScanCachedAt(null);
    setScanError(null);
    setActiveScanSessionKey(null);
    setScanSessions([]);
  }, []);

  return {
    selectedTable,
    tableInfo,
    scanResult,
    scanLoading,
    scanError,
    scanCachedAt,
    activeScanSessionKey,
    scanSessions,
    selectTable,
    refreshScan,
    loadNextScanPage,
    loadSession,
    deleteSession,
    resetTableData,
  };
}
