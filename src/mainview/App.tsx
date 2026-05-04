import { useEffect, useCallback, useState } from "react";
import { rpc } from "./lib/electrobun";
import { cacheSet, cacheDel, cachePurge } from "./lib/cache";
import { cacheGet } from "./lib/cache";
import { CACHE_FUNCTIONS, CACHE_REGION, CACHE_SELECTED_SERVICE, CACHE_TABLES } from "./lib/cache-keys";
import { Navbar } from "./components/Navbar";
import { SettingsPanel } from "./features/settings/SettingsPanel";
import { HomeScreen } from "./features/home/HomeScreen";
import { DynamoDBExplorer } from "./features/dynamodb/DynamoDBExplorer";
import { LambdaExplorer } from "./features/lambda/LambdaExplorer";
import { useTheme } from "./theme/ThemeProvider";
import { SettingsProvider, useSettingsCtx } from "./hooks/SettingsContext";
import { TablesProvider, useTablesCtx } from "./hooks/TablesContext";
import { TableDataProvider, useTableDataCtx } from "./hooks/TableDataContext";
import { QueryDataProvider, useQueryDataCtx } from "./hooks/QueryDataContext";
import { LambdaFunctionsProvider, useLambdaFunctionsCtx } from "./hooks/LambdaFunctionsContext";
import { LambdaLogsProvider, useLambdaLogsCtx } from "./hooks/LambdaLogsContext";
import type { AwsService } from "shared/schemas";

function AppLayout() {
  const t = useTheme();
  const settings = useSettingsCtx();
  const tables = useTablesCtx();
  const tableData = useTableDataCtx();
  const queryData = useQueryDataCtx();
  const lambdaFunctions = useLambdaFunctionsCtx();
  const lambdaLogs = useLambdaLogsCtx();
  const [service, setService] = useState<AwsService>("home");

  const handleServiceChange = useCallback((nextService: AwsService) => {
    setService(nextService);
    cacheSet(CACHE_SELECTED_SERVICE, nextService).catch(() => {});
  }, []);

  const handleRegionChange = useCallback(async (newRegion: string) => {
    settings.setRegion(newRegion);
    tables.resetTables();
    cacheSet(CACHE_REGION, newRegion).catch(() => {});
    cacheDel(CACHE_TABLES).catch(() => {});
    cacheDel(CACHE_FUNCTIONS).catch(() => {});
    tableData.resetTableData();
    queryData.resetQueryData();
    lambdaFunctions.resetFunctions();
    lambdaLogs.resetLambdaLogs();
    await rpc.request.setRegion({ region: newRegion });
    if (service === "dynamodb") tables.loadTables();
    if (service === "lambda") lambdaFunctions.loadFunctions();
  }, [lambdaFunctions, lambdaLogs, queryData, service, settings, tableData, tables]);

  const handlePurgeCache = useCallback(async () => {
    await cachePurge();
    tables.resetTables();
    tableData.resetTableData();
    queryData.resetQueryData();
    lambdaFunctions.resetFunctions();
    lambdaLogs.resetLambdaLogs();
  }, [lambdaFunctions, lambdaLogs, tables, tableData, queryData]);

  useEffect(() => {
    async function init() {
      await settings.restoreSettingsFromCache();

      const cachedService = await cacheGet<AwsService>(CACHE_SELECTED_SERVICE);
      if (cachedService) setService(cachedService);

      rpc.request.ping({})
        .then(() => settings.setConnectionStatus("connected"))
        .catch(() => settings.setConnectionStatus("error"));
    }
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (service === "dynamodb" && tables.tables.length === 0 && !tables.tablesLoading) {
      tables.restoreTablesFromCache().then((hasCache) => {
        if (!hasCache) tables.loadTables();
      });
    }
    if (service === "lambda" && lambdaFunctions.functions.length === 0 && !lambdaFunctions.functionsLoading) {
      lambdaFunctions.restoreFunctionsFromCache().then((hasCache) => {
        if (!hasCache) lambdaFunctions.loadFunctions();
      });
    }
  }, [service]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`h-screen w-screen overflow-hidden ${t.bg.base} ${t.text.primary} grid grid-rows-[3rem_1fr] grid-cols-[16rem_1fr]`}>
      <Navbar service={service} onHome={() => handleServiceChange("home")} />
      {service === "home" && <HomeScreen onSelectService={handleServiceChange} />}
      {service === "dynamodb" && <DynamoDBExplorer />}
      {service === "lambda" && <LambdaExplorer />}
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
        <LambdaFunctionsProvider>
          <LambdaLogsProvider>
            <SettingsConsumer>
              {(scanLimit) => (
                <TableDataProvider scanLimit={scanLimit}>
                  <QueryDataBridge scanLimit={scanLimit}>
                    {children}
                  </QueryDataBridge>
                </TableDataProvider>
              )}
            </SettingsConsumer>
          </LambdaLogsProvider>
        </LambdaFunctionsProvider>
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
