import { useMemo, useState } from "react";
import type { VisibilityState } from "@tanstack/react-table";
import { Button } from "../../components/Button";
import { CacheIndicator } from "../../components/CacheIndicator";
import { Dropdown } from "../../components/Dropdown";
import { Icon, IconPaths } from "../../components/Icon";
import { SearchInput } from "../../components/SearchInput";
import { Tooltip } from "../../components/Tooltip";
import { DataGrid } from "../table-view/DataGrid";
import { SessionsDropdown } from "../table-view/SessionsDropdown";
import { useTheme } from "../../theme/ThemeProvider";
import { useLambdaLogsCtx } from "../../hooks/LambdaLogsContext";

const WINDOW_OPTIONS = [
  { value: 5, label: "5 min" },
  { value: 15, label: "15 min" },
  { value: 60, label: "1 hour" },
  { value: 360, label: "6 hours" },
  { value: 1440, label: "24 hours" },
];

const LIMIT_OPTIONS = [100, 250, 500, 1000];

function formatTime(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function inferLevel(message: string): string {
  const match = /\b(ERROR|WARN|WARNING|INFO|DEBUG|TRACE)\b/i.exec(message);
  return match?.[1]?.toUpperCase() ?? "";
}

export function LambdaMainContent() {
  const t = useTheme();
  const {
    selectedFunction,
    functionInfo,
    logResult,
    logLoading,
    logError,
    logCachedAt,
    activeLogSessionKey,
    logSessions,
    windowMinutes,
    setWindowMinutes,
    logLimit,
    setLogLimit,
    refreshLogs,
    loadNextLogPage,
    loadLogSession,
    deleteLogSession,
  } = useLambdaLogsCtx();

  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const columnVisibility = useMemo<VisibilityState>(() => ({}), []);

  function toggleSearch() {
    setSearchOpen((prev) => {
      if (prev) setSearch("");
      return !prev;
    });
  }

  const rows = useMemo(() => {
    return (logResult?.events ?? []).map((event) => ({
      timestamp: formatTime(event.timestamp),
      level: inferLevel(event.message),
      requestId: event.requestId ?? "",
      logStream: event.logStreamName,
      message: event.message.trimEnd(),
    }));
  }, [logResult?.events]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      Object.values(row).some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [rows, search]);

  if (!selectedFunction) {
    return (
      <div className={`flex flex-col items-center justify-center h-full ${t.text.faint}`}>
        <Icon size={48} className="mb-4">
          {IconPaths.bolt}
        </Icon>
        <p className="text-sm">Select a function to view CloudWatch logs</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0 h-full overflow-hidden">
      <div className={`flex items-center justify-between px-4 py-2 border-b ${t.border.base} shrink-0`}>
        <div className="flex items-center gap-2 min-w-0">
          <h2 className={`text-sm font-semibold ${t.text.primary} truncate`}>{selectedFunction}</h2>
          {functionInfo?.runtime && (
            <span className={`text-xs ${t.text.faint} border ${t.border.muted} rounded px-1.5 py-0.5`}>
              {functionInfo.runtime}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Dropdown
            size="sm"
            options={WINDOW_OPTIONS}
            value={windowMinutes}
            onChange={(value) => setWindowMinutes(Number(value))}
          />
          <Dropdown
            size="sm"
            options={LIMIT_OPTIONS.map((n) => ({ value: n, label: `${n} events` }))}
            value={logLimit}
            onChange={(value) => setLogLimit(Number(value))}
          />
          <Tooltip text={searchOpen ? "Close search" : "Search logs"}>
            <Button.Container variant="ghost" onClick={toggleSearch}>
              <Button.Icon>
                <Icon size={14} className={searchOpen ? t.text.brand : ""}>{IconPaths.search}</Icon>
              </Button.Icon>
            </Button.Container>
          </Tooltip>
          <SessionsDropdown
            sessions={logSessions}
            activeSessionKey={activeLogSessionKey}
            onSelectSession={loadLogSession}
            onDeleteSession={deleteLogSession}
            disabled={logLoading}
          />
          <Tooltip text="New log session">
            <Button.Container variant="ghost" onClick={refreshLogs} disabled={logLoading}>
              <Button.Icon>
                <Icon size={14}>{IconPaths.refresh}</Icon>
              </Button.Icon>
            </Button.Container>
          </Tooltip>
          <CacheIndicator cachedAt={logCachedAt} position="left" />
        </div>
      </div>

      {functionInfo && (
        <div className={`grid grid-cols-2 lg:grid-cols-5 gap-x-4 gap-y-1 px-4 py-2 border-b ${t.border.base} ${t.bg.surfaceDim} shrink-0`}>
          <Meta label="Handler" value={functionInfo.handler} />
          <Meta label="Memory" value={functionInfo.memorySize ? `${functionInfo.memorySize} MB` : undefined} />
          <Meta label="Timeout" value={functionInfo.timeout ? `${functionInfo.timeout}s` : undefined} />
          <Meta label="Code" value={functionInfo.codeSize ? `${Math.round(functionInfo.codeSize / 1024)} KB` : undefined} />
          <Meta label="Logs" value={functionInfo.logGroupName} />
        </div>
      )}

      {searchOpen && (
        <div className={`flex items-center gap-2 px-3 py-1.5 border-b ${t.border.base} shrink-0`}>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Filter logs..."
            autoFocus
          />
          {search.trim() && (
            <span className={`text-xs ${t.text.faint} whitespace-nowrap`}>
              {filteredRows.length} of {rows.length}
            </span>
          )}
        </div>
      )}

      <div className="flex-1 min-h-0">
        {logLoading && !logResult && (
          <div className={`flex items-center justify-center h-full ${t.text.faint}`}>
            <p className="text-sm animate-pulse">Fetching recent logs...</p>
          </div>
        )}

        {logError && !logLoading && (
          <div className="flex items-center justify-center h-full">
            <div className={`max-w-md w-full mx-4 p-4 rounded-lg border ${t.border.base} ${t.bg.surface}`}>
              <div className="flex items-start gap-3">
                <Icon size={20} className={`${t.text.error} shrink-0 mt-0.5`}>{IconPaths.warning}</Icon>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${t.text.primary}`}>Log fetch failed</p>
                  <p className={`mt-1 text-xs ${t.text.muted} break-words whitespace-pre-wrap`}>{logError}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      className={`text-xs px-2.5 py-1 rounded ${t.button.sm} cursor-pointer`}
                      onClick={refreshLogs}
                    >
                      Retry
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {logResult && !logLoading && (
          rows.length === 0 ? (
            <div className={`flex items-center justify-center h-full ${t.text.faint}`}>
              <p className="text-sm">No log events found</p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className={`flex items-center justify-center h-full ${t.text.faint}`}>
              <p className="text-sm">No logs match your search</p>
            </div>
          ) : (
            <DataGrid
              items={filteredRows}
              tableKeys={[]}
              gsis={[]}
              lsis={[]}
              hasNextPage={!!logResult.nextToken}
              loadingNextPage={logLoading}
              onLoadNextPage={loadNextLogPage}
              columnVisibility={columnVisibility}
            />
          )
        )}
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value?: string }) {
  const t = useTheme();
  return (
    <div className="min-w-0">
      <div className={`text-[10px] uppercase ${t.text.faint}`}>{label}</div>
      <div className={`text-xs ${t.text.secondary} truncate`} title={value ?? ""}>
        {value ?? "-"}
      </div>
    </div>
  );
}
