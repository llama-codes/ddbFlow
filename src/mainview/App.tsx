import { useEffect, useCallback } from "react";
import { rpc } from "./lib/electrobun";
import { cacheSet, cacheDel, cachePurge } from "./lib/cache";
import { CACHE_REGION, CACHE_TABLES } from "./lib/cache-keys";
import { Navbar } from "./components/Navbar";
import { TableList } from "./features/sidebar/TableList";
import { MainContent } from "./features/table-view/MainContent";
import { SettingsPanel } from "./features/settings/SettingsPanel";
import { useTheme } from "./theme/ThemeProvider";
import { SettingsProvider, useSettingsCtx } from "./hooks/SettingsContext";
import { TablesProvider, useTablesCtx } from "./hooks/TablesContext";
import { TableDataProvider, useTableDataCtx } from "./hooks/TableDataContext";
import { QueryDataProvider, useQueryDataCtx } from "./hooks/QueryDataContext";

function AppLayout() {
  const t = useTheme();
  const settings = useSettingsCtx();
  const tables = useTablesCtx();
  const tableData = useTableDataCtx();
  const queryData = useQueryDataCtx();

  const handleRegionChange = useCallback(async (newRegion: string) => {
    settings.setRegion(newRegion);
    tables.resetTables();
    cacheSet(CACHE_REGION, newRegion).catch(() => {});
    cacheDel(CACHE_TABLES).catch(() => {});
    await rpc.request.setRegion({ region: newRegion });
    tables.loadTables();
  }, [settings, tables]);

  const handlePurgeCache = useCallback(async () => {
    await cachePurge();
    tables.resetTables();
    tableData.resetTableData();
    queryData.resetQueryData();
  }, [tables, tableData, queryData]);

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
      <Navbar />
      <TableList />
      <MainContent />
      <SettingsPanel
        onRegionChange={handleRegionChange}
        onPurgeCache={handlePurgeCache}
      />
    </div>
  );
}

function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <TablesProvider>
        <SettingsConsumer>
          {(scanLimit) => (
            <TableDataProvider scanLimit={scanLimit}>
              <QueryDataBridge scanLimit={scanLimit}>
                {children}
              </QueryDataBridge>
            </TableDataProvider>
          )}
        </SettingsConsumer>
      </TablesProvider>
    </SettingsProvider>
  );
}

/** Bridges SettingsContext.scanLimit into TableDataProvider */
function SettingsConsumer({ children }: { children: (scanLimit: number) => React.ReactNode }) {
  const { scanLimit } = useSettingsCtx();
  return <>{children(scanLimit)}</>;
}

/** Bridges TableDataContext into QueryDataProvider */
function QueryDataBridge({ children, scanLimit }: { children: React.ReactNode; scanLimit: number }) {
  const { selectedTable, tableInfo } = useTableDataCtx();
  return (
    <QueryDataProvider selectedTable={selectedTable} tableInfo={tableInfo} scanLimit={scanLimit}>
      {children}
    </QueryDataProvider>
  );
}

export function App() {
  return (
    <AppProviders>
      <AppLayout />
    </AppProviders>
  );
}
