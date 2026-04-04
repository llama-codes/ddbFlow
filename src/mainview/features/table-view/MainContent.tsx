import { useState, useEffect, useMemo, useCallback } from "react";
import type { VisibilityState } from "@tanstack/react-table";
import { Icon, IconPaths } from "../../components/Icon";
import { Tooltip } from "../../components/Tooltip";
import { Button } from "../../components/Button";
import { CacheIndicator } from "../../components/CacheIndicator";
import { DataGrid } from "./DataGrid";
import { ColumnVisibilityDropdown } from "./ColumnVisibilityDropdown";
import { SessionsDropdown } from "./SessionsDropdown";
import { SearchInput } from "../../components/SearchInput";
import { useTheme } from "../../theme/ThemeProvider";
import { cacheGet, cacheSet } from "../../lib/cache";
import { formatValue } from "../../lib/format";
import type { QueryResult, TableInfo } from "shared/schemas";
import type { ScanSession } from "../../App";

const CACHE_COLVIS = (t: string) => `ddbflow:colvis:${t}`;

interface MainContentProps {
  selectedTable: string | null;
  tableInfo: TableInfo | null;
  scanResult: QueryResult | null;
  scanLoading: boolean;
  scanError: string | null;
  scanCachedAt: string | null;
  scanSessions: ScanSession[];
  activeScanSessionKey: string | null;
  onRefreshScan: () => void;
  onLoadNextPage: () => void;
  onSelectSession: (key: string) => void;
  onDeleteSession: (key: string) => void;
}

export function MainContent({
  selectedTable,
  tableInfo,
  scanResult,
  scanLoading,
  scanError,
  scanCachedAt,
  scanSessions,
  activeScanSessionKey,
  onRefreshScan,
  onLoadNextPage,
  onSelectSession,
  onDeleteSession,
}: MainContentProps) {
  const t = useTheme();

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [visibilityLoaded, setVisibilityLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  function toggleSearch() {
    setSearchOpen((prev) => {
      if (prev) setSearch("");
      return !prev;
    });
  }

  const hashKey = tableInfo?.keys.find((k) => k.keyType === "HASH")?.attributeName;
  const rangeKey = tableInfo?.keys.find((k) => k.keyType === "RANGE")?.attributeName;

  const protectedKeys = useMemo(() => {
    if (!tableInfo?.keys) return new Set<string>();
    return new Set(tableInfo.keys.map((k) => k.attributeName));
  }, [tableInfo]);

  // Count how many GSIs / LSIs each attribute participates in
  const gsiCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const gsi of tableInfo?.gsis ?? []) {
      for (const key of gsi.keys) {
        map.set(key.attributeName, (map.get(key.attributeName) ?? 0) + 1);
      }
    }
    return map;
  }, [tableInfo]);

  const lsiCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const lsi of tableInfo?.lsis ?? []) {
      for (const key of lsi.keys) {
        map.set(key.attributeName, (map.get(key.attributeName) ?? 0) + 1);
      }
    }
    return map;
  }, [tableInfo]);

  const toggleableColumns = useMemo(() => {
    if (!scanResult?.items.length) return [];
    const allKeys = Array.from(new Set(scanResult.items.flatMap((item) => Object.keys(item))));
    return allKeys.filter((k) => !protectedKeys.has(k));
  }, [scanResult, protectedKeys]);

  const dropdownColumns = useMemo(
    () => toggleableColumns.map((id) => ({
      id,
      isVisible: columnVisibility[id] !== false,
      keyType: id === hashKey ? "PK" as const : id === rangeKey ? "SK" as const : null,
      gsiCount: gsiCountMap.get(id) ?? 0,
      lsiCount: lsiCountMap.get(id) ?? 0,
    })),
    [toggleableColumns, columnVisibility, hashKey, rangeKey, gsiCountMap, lsiCountMap],
  );

  const filteredItems = useMemo(() => {
    const items = scanResult?.items ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((row) =>
      Object.entries(row).some(([key, value]) => {
        if (columnVisibility[key] === false) return false;
        return formatValue(value).toLowerCase().includes(term);
      })
    );
  }, [scanResult?.items, search, columnVisibility]);

  // Load cached column visibility when table changes
  useEffect(() => {
    setColumnVisibility({});
    setVisibilityLoaded(false);
    setSearch("");
    setSearchOpen(false);
    if (!selectedTable) return;
    cacheGet<VisibilityState>(CACHE_COLVIS(selectedTable)).then((cached) => {
      if (cached) setColumnVisibility(cached);
      setVisibilityLoaded(true);
    });
  }, [selectedTable]);

  // Persist column visibility changes
  useEffect(() => {
    if (!selectedTable || !visibilityLoaded) return;
    if (Object.keys(columnVisibility).length === 0) return;
    cacheSet(CACHE_COLVIS(selectedTable), columnVisibility).catch(() => {});
  }, [columnVisibility, selectedTable, visibilityLoaded]);

  const handleToggleColumn = useCallback((columnId: string) => {
    setColumnVisibility((prev) => ({ ...prev, [columnId]: prev[columnId] === false ? true : false }));
  }, []);

  const handleShowAll = useCallback(() => {
    setColumnVisibility((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) next[key] = true;
      return next;
    });
  }, []);

  const handleHideAll = useCallback(() => {
    setColumnVisibility((prev) => {
      const next = { ...prev };
      for (const col of toggleableColumns) next[col] = false;
      return next;
    });
  }, [toggleableColumns]);

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
        </div>
        <div className="flex items-center gap-1">
          <Tooltip text={searchOpen ? "Close search" : "Search items"}>
            <Button.Container variant="ghost" onClick={toggleSearch}>
              <Button.Icon>
                <Icon size={14} className={searchOpen ? t.text.brand : ""}>{IconPaths.search}</Icon>
              </Button.Icon>
            </Button.Container>
          </Tooltip>
          <ColumnVisibilityDropdown
            columns={dropdownColumns}
            onToggle={handleToggleColumn}
            onShowAll={handleShowAll}
            onHideAll={handleHideAll}
          />
          <SessionsDropdown
            sessions={scanSessions}
            activeSessionKey={activeScanSessionKey}
            onSelectSession={onSelectSession}
            onDeleteSession={onDeleteSession}
            disabled={scanLoading}
          />
          <Tooltip text="New session">
            <Button.Container variant="ghost" onClick={onRefreshScan} disabled={scanLoading}>
              <Button.Icon>
                <Icon size={14}>{IconPaths.refresh}</Icon>
              </Button.Icon>
            </Button.Container>
          </Tooltip>
          <CacheIndicator cachedAt={scanCachedAt} position="left" />
        </div>
      </div>

      {searchOpen && (
        <div className={`flex items-center gap-2 px-3 py-1.5 border-b ${t.border.base} shrink-0`}>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Filter items…"
            autoFocus
          />
          {search.trim() && (
            <span className={`text-xs ${t.text.faint} whitespace-nowrap`}>
              {filteredItems.length} of {scanResult?.items.length ?? 0}
            </span>
          )}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 min-h-0">
        {scanLoading && (
          <div className={`flex items-center justify-center h-full ${t.text.faint}`}>
            <p className="text-sm animate-pulse">Scanning {selectedTable}…</p>
          </div>
        )}

        {scanError && !scanLoading && (
          <div className="flex items-center justify-center h-full">
            <div className={`max-w-md w-full mx-4 p-4 rounded-lg border ${t.border.base} ${t.bg.surface}`}>
              <div className="flex items-start gap-3">
                <Icon size={20} className={`${t.text.error} shrink-0 mt-0.5`}>{IconPaths.warning}</Icon>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${t.text.primary}`}>Scan failed</p>
                  <p className={`mt-1 text-xs ${t.text.muted} break-words whitespace-pre-wrap`}>{scanError}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      className={`text-xs px-2.5 py-1 rounded ${t.button.sm} cursor-pointer`}
                      onClick={onRefreshScan}
                    >
                      Retry
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {scanResult && !scanLoading && (
          scanResult.items.length === 0 ? (
            <div className={`flex items-center justify-center h-full ${t.text.faint}`}>
              <p className="text-sm">No items found</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className={`flex items-center justify-center h-full ${t.text.faint}`}>
              <p className="text-sm">No items match your search</p>
            </div>
          ) : (
            <DataGrid
              items={filteredItems}
              tableKeys={tableInfo?.keys ?? []}
              gsis={tableInfo?.gsis ?? []}
              lsis={tableInfo?.lsis ?? []}
              hasNextPage={!!scanResult.lastEvaluatedKey}
              loadingNextPage={scanLoading}
              onLoadNextPage={onLoadNextPage}
              columnVisibility={columnVisibility}
            />
          )
        )}
      </div>
    </div>
  );
}
