import { Icon, IconPaths } from "./Icon";
import { Tooltip } from "./Tooltip";
import { Button } from "./Button";
import { DataGrid } from "./DataGrid";
import { useTheme } from "../theme/ThemeProvider";
import type { QueryResult, TableInfo } from "shared/schemas";

interface MainContentProps {
  selectedTable: string | null;
  tableInfo: TableInfo | null;
  scanResult: QueryResult | null;
  scanLoading: boolean;
  scanError: string | null;
  scanCachedAt: string | null;
  onRefreshScan: () => void;
  onLoadNextPage: () => void;
}

export function MainContent({
  selectedTable,
  tableInfo,
  scanResult,
  scanLoading,
  scanError,
  scanCachedAt,
  onRefreshScan,
  onLoadNextPage,
}: MainContentProps) {
  const t = useTheme();

  if (!selectedTable) {
    return (
      <div className={`flex flex-col items-center justify-center h-full ${t.text.faint}`}>
        <Icon size={48} className="mb-4">
          {IconPaths.database}
        </Icon>
        <p className="text-sm">Select a table to view its data</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col min-h-0 h-full overflow-hidden`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2 border-b ${t.border.base} shrink-0`}>
        <div className="flex items-center gap-2">
          <h2 className={`text-sm font-semibold ${t.text.primary}`}>{selectedTable}</h2>
          {scanResult && (
            <span className={`text-xs ${t.text.faint}`}>
              {scanResult.count} item{scanResult.count !== 1 ? "s" : ""}
              {scanResult.lastEvaluatedKey ? " (partial)" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {scanCachedAt && (
            <Tooltip text={`Cached · ${new Date(scanCachedAt).toLocaleString()}`}>
              <span className={`p-1 ${t.text.warning} flex items-center cursor-default`}>
                <Icon size={13}>{IconPaths.clock}</Icon>
              </span>
            </Tooltip>
          )}
          <Button.Container variant="ghost" onClick={onRefreshScan} title="Refresh data" disabled={scanLoading}>
            <Button.Icon>
              <Icon size={14}>{IconPaths.refresh}</Icon>
            </Button.Icon>
          </Button.Container>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0">
        {scanLoading && (
          <div className={`flex items-center justify-center h-full ${t.text.faint}`}>
            <p className="text-sm animate-pulse">Scanning {selectedTable}…</p>
          </div>
        )}

        {scanError && !scanLoading && (
          <div className={`p-4 text-sm ${t.text.error}`}>
            <p className="font-medium">Scan failed</p>
            <p className={`mt-1 text-xs ${t.text.errorDim}`}>{scanError}</p>
          </div>
        )}

        {scanResult && !scanLoading && (
          scanResult.items.length === 0 ? (
            <div className={`flex items-center justify-center h-full ${t.text.faint}`}>
              <p className="text-sm">No items found</p>
            </div>
          ) : (
            <DataGrid
              items={scanResult.items}
              tableKeys={tableInfo?.keys ?? []}
              hasNextPage={!!scanResult.lastEvaluatedKey}
              loadingNextPage={scanLoading}
              onLoadNextPage={onLoadNextPage}
            />
          )
        )}
      </div>
    </div>
  );
}
