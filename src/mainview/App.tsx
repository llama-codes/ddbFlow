import { useState, useEffect, useCallback } from "react";
import { rpc } from "./lib/electrobun";
import { Navbar } from "./components/Navbar";
import { TableList } from "./components/TableList";
import { MainContent } from "./components/MainContent";
import { SettingsPanel } from "./components/SettingsPanel";
import { useTheme } from "./theme/ThemeProvider";
import type { QueryResult, TableInfo } from "shared/schemas";

const STORAGE_REGION = "ddbflow:region";
const STORAGE_TABLES = "ddbflow:tables-cache";

function scanCacheKey(tableName: string) {
  return `ddbflow:scan:${tableName}`;
}

function loadTablesCache(): { tables: string[]; fetchedAt: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_TABLES);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.tables) && typeof parsed.fetchedAt === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function schemaCacheKey(tableName: string) {
  return `ddbflow:schema:${tableName}`;
}

function loadSchemaCache(tableName: string): { info: TableInfo; fetchedAt: string } | null {
  try {
    const raw = localStorage.getItem(schemaCacheKey(tableName));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.info && typeof parsed.fetchedAt === "string") return parsed;
    return null;
  } catch {
    return null;
  }
}

function loadScanCache(tableName: string): { result: QueryResult; fetchedAt: string } | null {
  try {
    const raw = localStorage.getItem(scanCacheKey(tableName));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.result && typeof parsed.fetchedAt === "string") return parsed;
    return null;
  } catch {
    return null;
  }
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

  // Settings state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [region, setRegion] = useState(
    () => localStorage.getItem(STORAGE_REGION) ?? "us-east-1"
  );
  const [connectionStatus, setConnectionStatus] = useState<
    "unknown" | "connected" | "error"
  >("unknown");
  const [checkingConnection, setCheckingConnection] = useState(false);

  const loadTables = useCallback(async () => {
    setTablesLoading(true);
    setTablesError(null);
    try {
      const response = await rpc.request.listTables({});
      const fetchedAt = new Date().toISOString();
      setTables(response);
      setTablesCachedAt(fetchedAt);
      localStorage.setItem(STORAGE_TABLES, JSON.stringify({ tables: response, fetchedAt }));
      rpc.send.log({ msg: `listTables returned ${response.length} tables` });
    } catch (e) {
      setTablesError(e instanceof Error ? e.message : String(e));
    } finally {
      setTablesLoading(false);
    }
  }, []);

  const loadSchema = useCallback(async (tableName: string) => {
    const cache = loadSchemaCache(tableName);
    if (cache) { setTableInfo(cache.info); return; }
    try {
      const info = await rpc.request.describeTable({ tableName });
      setTableInfo(info);
      localStorage.setItem(schemaCacheKey(tableName), JSON.stringify({ info, fetchedAt: new Date().toISOString() }));
    } catch { /* non-fatal */ }
  }, []);

  const loadScan = useCallback(async (tableName: string) => {
    setScanLoading(true);
    setScanError(null);
    try {
      const response = await rpc.request.scan({ tableName, limit: 100 });
      const fetchedAt = new Date().toISOString();
      setScanResult(response);
      setScanCachedAt(fetchedAt);
      localStorage.setItem(scanCacheKey(tableName), JSON.stringify({ result: response, fetchedAt }));
    } catch (e) {
      setScanError(e instanceof Error ? e.message : String(e));
    } finally {
      setScanLoading(false);
    }
  }, []);

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
      setScanResult((prev) => prev ? {
        ...response,
        items: [...prev.items, ...response.items],
        count: prev.count + response.count,
        scannedCount: prev.scannedCount + response.scannedCount,
      } : response);
      setScanCachedAt(null); // no longer a clean cache
    } catch (e) {
      setScanError(e instanceof Error ? e.message : String(e));
    } finally {
      setScanLoading(false);
    }
  }, [selectedTable, scanResult]);

  const handleSelectTable = useCallback((tableName: string) => {
    setSelectedTable(tableName);
    setTableInfo(null);
    setScanResult(null);
    setScanError(null);
    setScanCachedAt(null);

    loadSchema(tableName);

    const cache = loadScanCache(tableName);
    if (cache) {
      setScanResult(cache.result);
      setScanCachedAt(cache.fetchedAt);
    } else {
      loadScan(tableName);
    }
  }, [loadScan, loadSchema]);

  const handleRefreshScan = useCallback(() => {
    if (!selectedTable) return;
    localStorage.removeItem(scanCacheKey(selectedTable));
    setScanCachedAt(null);
    loadScan(selectedTable);
  }, [selectedTable, loadScan]);

  const handleRegionChange = useCallback(async (newRegion: string) => {
    localStorage.setItem(STORAGE_REGION, newRegion);
    setRegion(newRegion);
    localStorage.removeItem(STORAGE_TABLES);
    setTablesCachedAt(null);
    await rpc.request.setRegion({ region: newRegion });
    loadTables();
  }, [loadTables]);

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
    const persistedRegion = localStorage.getItem(STORAGE_REGION) ?? "us-east-1";
    if (persistedRegion !== "us-east-1") {
      rpc.request.setRegion({ region: persistedRegion });
    }

    const cache = loadTablesCache();
    if (cache) {
      setTables(cache.tables);
      setTablesCachedAt(cache.fetchedAt);
    } else {
      loadTables();
    }

    rpc.request.ping({})
      .then(() => setConnectionStatus("connected"))
      .catch(() => setConnectionStatus("error"));
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
        onRefreshScan={handleRefreshScan}
        onLoadNextPage={loadNextScanPage}
      />
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        region={region}
        onRegionChange={handleRegionChange}
        connectionStatus={connectionStatus}
        checkingConnection={checkingConnection}
        onCheckConnection={checkConnection}
      />
    </div>
  );
}
