import { useState, useEffect, useCallback } from "react";
import { rpc } from "./lib/electrobun";
import { Navbar } from "./components/Navbar";
import { TableList } from "./components/TableList";
import { MainContent } from "./components/MainContent";
import { SettingsPanel } from "./components/SettingsPanel";

export function App() {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [tablesError, setTablesError] = useState<string | null>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [region, setRegion] = useState("us-east-1");
  const [connectionStatus, setConnectionStatus] = useState<
    "unknown" | "connected" | "error"
  >("unknown");
  const [checkingConnection, setCheckingConnection] = useState(false);

  const loadTables = useCallback(async () => {
    setTablesLoading(true);
    setTablesError(null);
    try {
      const response = await rpc.request.listTables({});
      setTables(response);
      rpc.send.log({ msg: `listTables returned ${response.length} tables` });
    } catch (e) {
      setTablesError(e instanceof Error ? e.message : String(e));
    } finally {
      setTablesLoading(false);
    }
  }, []);

  const handleRegionChange = useCallback(async (newRegion: string) => {
    setRegion(newRegion);
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
    loadTables();
  }, [loadTables]);

  return (
    <div className="h-screen w-screen bg-gray-950 text-gray-100 grid grid-rows-[3rem_1fr] grid-cols-[16rem_1fr]">
      <Navbar onToggleSettings={() => setSettingsOpen((o) => !o)} />
      <TableList
        tables={tables}
        selectedTable={selectedTable}
        loading={tablesLoading}
        error={tablesError}
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
