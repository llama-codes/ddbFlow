import { useState, useEffect, useCallback } from "react";
import { rpc } from "./lib/electrobun";
import { cacheGet, cacheSet, cacheDel, cachePurge, cacheList } from "./lib/cache";
import { Navbar } from "./components/Navbar";
import { TableList } from "./features/sidebar/TableList";
import { MainContent } from "./features/table-view/MainContent";
import { SettingsPanel } from "./features/settings/SettingsPanel";
import { useTheme } from "./theme/ThemeProvider";
import type { QueryResult, TableInfo } from "shared/schemas";

const CACHE_REGION = "ddbflow:region";
const CACHE_TABLES = "ddbflow:tables-cache";
const CACHE_SCHEMA = (t: string) => `ddbflow:schema:${t}`;
const CACHE_SCAN_PREFIX = (t: string) => `ddbflow:scan:${t}`;
const CACHE_SCAN_SESSION = (t: string, ts: string) => `ddbflow:scan:${t}:${ts}`;

function sessionTimestamp(): string {
  return new Date().toISOString().replace(/:/g, "-");
}

function extractErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "object" && e !== null) {
    const obj = e as Record<string, unknown>;
    if (obj.cause instanceof Error) return obj.cause.message;
    if (typeof obj.cause === "object" && obj.cause !== null) {
      const cause = obj.cause as Record<string, unknown>;
      if (typeof cause.message === "string") return cause.message;
      if (typeof cause.name === "string") return cause.name;
    }
    if (typeof obj.message === "string") return obj.message;
    if (typeof obj._tag === "string") {
      if (typeof obj.message === "string") return `${obj._tag}: ${obj.message}`;
      return obj._tag;
    }
  }
  return String(e);
}

export interface ScanSession {
  cacheKey: string;
  fetchedAt: string;
  itemCount: number;
}

export function App() {
  const t = useTheme();

  // Tables list state
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [tablesError, setTablesError] = useState<string | null>(null);
  const [tablesCachedAt, setTablesCachedAt] = useState<string | null>(null);

  // Schema state
  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null);

  // Scan state
  const [scanResult, setScanResult] = useState<QueryResult | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanCachedAt, setScanCachedAt] = useState<string | null>(null);

  // Session state
  const [activeScanSessionKey, setActiveScanSessionKey] = useState<string | null>(null);
  const [scanSessions, setScanSessions] = useState<ScanSession[]>([]);

  // Settings state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [region, setRegion] = useState("us-east-1");
  const [connectionStatus, setConnectionStatus] = useState<"unknown" | "connected" | "error">("unknown");
  const [checkingConnection, setCheckingConnection] = useState(false);

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
      const response = await rpc.request.scan({ tableName, limit: 100 });
      const fetchedAt = new Date().toISOString();
      const ts = sessionTimestamp();
      const sessionKey = CACHE_SCAN_SESSION(tableName, ts);
      setScanResult(response);
      setScanCachedAt(fetchedAt);
      setActiveScanSessionKey(sessionKey);
      cacheSet(sessionKey, { result: response, fetchedAt }).catch(() => {});
      refreshSessionList(tableName);
    } catch (e) {
      setScanError(extractErrorMessage(e));
    } finally {
      setScanLoading(false);
    }
  }, [refreshSessionList]);

  const loadNextScanPage = useCallback(async () => {
    if (!selectedTable || !scanResult?.lastEvaluatedKey) return;
    setScanLoading(true);
    setScanError(null);
    try {
      const response = await rpc.request.scan({
        tableName: selectedTable,
        limit: 100,
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
  }, [selectedTable, scanResult, activeScanSessionKey]);

  const handleSelectTable = useCallback(async (tableName: string) => {
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

  const handleRefreshScan = useCallback(() => {
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

  const handleRegionChange = useCallback(async (newRegion: string) => {
    setRegion(newRegion);
    setTablesCachedAt(null);
    cacheSet(CACHE_REGION, newRegion).catch(() => {});
    cacheDel(CACHE_TABLES).catch(() => {});
    await rpc.request.setRegion({ region: newRegion });
    loadTables();
  }, [loadTables]);

  const handlePurgeCache = useCallback(async () => {
    await cachePurge();
    setTables([]);
    setTablesCachedAt(null);
    setSelectedTable(null);
    setTableInfo(null);
    setScanResult(null);
    setScanCachedAt(null);
    setScanError(null);
    setActiveScanSessionKey(null);
    setScanSessions([]);
  }, []);

  const checkConnection = useCallback(async () => {
    setCheckingConnection(true);
    try {
      await rpc.request.ping({});
      setConnectionStatus("connected");
    } catch {
      setConnectionStatus("error");
    } finally {
      setCheckingConnection(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      const cachedRegion = await cacheGet<string>(CACHE_REGION);
      if (cachedRegion) {
        setRegion(cachedRegion);
        await rpc.request.setRegion({ region: cachedRegion });
      }

      const tablesCache = await cacheGet<{ tables: string[]; fetchedAt: string }>(CACHE_TABLES);
      if (tablesCache) {
        setTables(tablesCache.tables);
        setTablesCachedAt(tablesCache.fetchedAt);
      } else {
        loadTables();
      }

      rpc.request.ping({})
        .then(() => setConnectionStatus("connected"))
        .catch(() => setConnectionStatus("error"));
    }
    init();
  }, [loadTables]);

  return (
    <div className={`h-screen w-screen overflow-hidden ${t.bg.base} ${t.text.primary} grid grid-rows-[3rem_1fr] grid-cols-[16rem_1fr]`}>
      <Navbar credentialStatus={connectionStatus} onToggleSettings={() => setSettingsOpen((o) => !o)} />
      <TableList
        tables={tables}
        selectedTable={selectedTable}
        loading={tablesLoading}
        error={tablesError}
        cachedAt={tablesCachedAt}
        onSelectTable={handleSelectTable}
        onRefresh={loadTables}
      />
      <MainContent
        selectedTable={selectedTable}
        tableInfo={tableInfo}
        scanResult={scanResult}
        scanLoading={scanLoading}
        scanError={scanError}
        scanCachedAt={scanCachedAt}
        scanSessions={scanSessions}
        activeScanSessionKey={activeScanSessionKey}
        onRefreshScan={handleRefreshScan}
        onLoadNextPage={loadNextScanPage}
        onSelectSession={loadSession}
        onDeleteSession={deleteSession}
      />
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        region={region}
        onRegionChange={handleRegionChange}
        connectionStatus={connectionStatus}
        checkingConnection={checkingConnection}
        onCheckConnection={checkConnection}
        onPurgeCache={handlePurgeCache}
      />
    </div>
  );
}
