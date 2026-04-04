import { useEffect, useCallback } from "react";
import { rpc } from "./lib/electrobun";
import { cacheSet, cacheDel, cachePurge } from "./lib/cache";
import { CACHE_REGION, CACHE_TABLES } from "./lib/cache-keys";
import { Navbar } from "./components/Navbar";
import { TableList } from "./features/sidebar/TableList";
import { MainContent } from "./features/table-view/MainContent";
import { SettingsPanel } from "./features/settings/SettingsPanel";
import { useTheme } from "./theme/ThemeProvider";
import { useTables } from "./hooks/useTables";
import { useTableData } from "./hooks/useTableData";
import { useSettings } from "./hooks/useSettings";

export function App() {
  const t = useTheme();

  const settings = useSettings();
  const tables = useTables();
  const tableData = useTableData(settings.scanLimit);

  // Cross-cutting: region change resets tables and refetches
  const handleRegionChange = useCallback(async (newRegion: string) => {
    settings.setRegion(newRegion);
    tables.resetTables();
    cacheSet(CACHE_REGION, newRegion).catch(() => {});
    cacheDel(CACHE_TABLES).catch(() => {});
    await rpc.request.setRegion({ region: newRegion });
    tables.loadTables();
  }, [settings, tables]);

  // Cross-cutting: purge resets everything
  const handlePurgeCache = useCallback(async () => {
    await cachePurge();
    tables.resetTables();
    tableData.resetTableData();
  }, [tables, tableData]);

  // Init: restore cached settings, tables, and check connection
  useEffect(() => {
    async function init() {
      await settings.restoreSettingsFromCache();

      const hasCache = await tables.restoreTablesFromCache();
      if (!hasCache) tables.loadTables();

      rpc.request.ping({})
        .then(() => settings.setConnectionStatus("connected"))
        .catch(() => settings.setConnectionStatus("error"));
    }
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`h-screen w-screen overflow-hidden ${t.bg.base} ${t.text.primary} grid grid-rows-[3rem_1fr] grid-cols-[16rem_1fr]`}>
      <Navbar credentialStatus={settings.connectionStatus} onToggleSettings={settings.toggleSettings} />
      <TableList
        tables={tables.tables}
        selectedTable={tableData.selectedTable}
        loading={tables.tablesLoading}
        error={tables.tablesError}
        cachedAt={tables.tablesCachedAt}
        onSelectTable={tableData.selectTable}
        onRefresh={tables.loadTables}
      />
      <MainContent
        selectedTable={tableData.selectedTable}
        tableInfo={tableData.tableInfo}
        scanResult={tableData.scanResult}
        scanLoading={tableData.scanLoading}
        scanError={tableData.scanError}
        scanCachedAt={tableData.scanCachedAt}
        scanSessions={tableData.scanSessions}
        activeScanSessionKey={tableData.activeScanSessionKey}
        onRefreshScan={tableData.refreshScan}
        onLoadNextPage={tableData.loadNextScanPage}
        onSelectSession={tableData.loadSession}
        onDeleteSession={tableData.deleteSession}
      />
      <SettingsPanel
        open={settings.settingsOpen}
        onClose={settings.closeSettings}
        region={settings.region}
        onRegionChange={handleRegionChange}
        scanLimit={settings.scanLimit}
        onScanLimitChange={settings.handleScanLimitChange}
        connectionStatus={settings.connectionStatus}
        checkingConnection={settings.checkingConnection}
        onCheckConnection={settings.checkConnection}
        onPurgeCache={handlePurgeCache}
      />
    </div>
  );
}
