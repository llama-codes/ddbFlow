import { useState, useEffect, useCallback } from "react";
import { rpc } from "./lib/electrobun";
import { Navbar } from "./components/Navbar";
import { TableList } from "./components/TableList";
import { MainContent } from "./components/MainContent";
import { SettingsPanel } from "./components/SettingsPanel";

const STORAGE_REGION = "ddbflow:region";
const STORAGE_TABLES = "ddbflow:tables-cache";

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

export function App() {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [tablesError, setTablesError] = useState<string | null>(null);
  const [tablesCachedAt, setTablesCachedAt] = useState<string | null>(null);

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
      localStorage.setItem(
        STORAGE_TABLES,
        JSON.stringify({ tables: response, fetchedAt })
      );
      rpc.send.log({ msg: `listTables returned ${response.length} tables` });
    } catch (e) {
      setTablesError(e instanceof Error ? e.message : String(e));
    } finally {
      setTablesLoading(false);
    }
  }, []);

  const handleRegionChange = useCallback(
    async (newRegion: string) => {
      localStorage.setItem(STORAGE_REGION, newRegion);
      setRegion(newRegion);
      localStorage.removeItem(STORAGE_TABLES);
      setTablesCachedAt(null);
      await rpc.request.setRegion({ region: newRegion });
      loadTables();
    },
    [loadTables]
  );

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

    // Check credentials on startup
    rpc.request.ping({}).then(() => setConnectionStatus("connected")).catch(() => setConnectionStatus("error"));
  }, [loadTables]);

  return (
    <div className="h-screen w-screen bg-gray-950 text-gray-100 grid grid-rows-[3rem_1fr] grid-cols-[16rem_1fr]">
      <Navbar credentialStatus={connectionStatus} onToggleSettings={() => setSettingsOpen((o) => !o)} />
      <TableList
        tables={tables}
        selectedTable={selectedTable}
        loading={tablesLoading}
        error={tablesError}
        cachedAt={tablesCachedAt}
        onSelectTable={setSelectedTable}
        onRefresh={loadTables}
      />
      <MainContent selectedTable={selectedTable} />
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
