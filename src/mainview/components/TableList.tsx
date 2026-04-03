import { useState } from "react";
import { Icon, IconPaths } from "./Icon";
import { Tooltip } from "./Tooltip";
import { Button } from "./Button";
import { Title } from "./Title";
import { useTheme } from "../theme/ThemeProvider";

interface TableListProps {
  tables: string[];
  selectedTable: string | null;
  loading: boolean;
  error: string | null;
  cachedAt: string | null;
  onSelectTable: (name: string) => void;
  onRefresh: () => void;
}

export function TableList({
  tables,
  selectedTable,
  loading,
  error,
  cachedAt,
  onSelectTable,
  onRefresh,
}: TableListProps) {
  const t = useTheme();
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? tables.filter((t) => t.toLowerCase().includes(search.toLowerCase()))
    : tables;

  return (
    <div className={`${t.bg.surfaceDim} border-r ${t.border.base} flex flex-col min-h-0`}>
      <div className={`flex items-center justify-between px-3 py-2 border-b ${t.border.base}`}>
        <Title>Tables</Title>
        <div className="flex items-center gap-0.5">
          {cachedAt && (
            <Tooltip text={`Cached · ${new Date(cachedAt).toLocaleString()}`}>
              <span className={`p-1 ${t.text.warning} flex items-center cursor-default`}>
                <Icon size={13}>{IconPaths.clock}</Icon>
              </span>
            </Tooltip>
          )}
          <Button.Container variant="ghost" onClick={onRefresh} title="Refresh tables">
            <Button.Icon>
              <Icon size={14}>{IconPaths.refresh}</Icon>
            </Button.Icon>
          </Button.Container>
        </div>
      </div>

      <div className={`px-2 py-1.5 border-b ${t.border.base}`}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter tables…"
          className={`w-full text-xs ${t.input.base} rounded px-2 py-1.5 placeholder:${t.text.faint}`}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <p className={`px-3 py-4 text-sm ${t.text.faint} animate-pulse`}>
            Loading tables...
          </p>
        )}

        {error && (
          <div className={`px-3 py-3 text-sm ${t.text.error}`}>
            <p className="font-medium">Failed to load</p>
            <p className={`text-xs ${t.text.errorDim} mt-1`}>{error}</p>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <p className={`px-3 py-4 text-sm ${t.text.faint}`}>
            {search.trim() ? "No matches" : "No tables found"}
          </p>
        )}

        {!loading && filtered.length > 0 && (
          <ul>
            {filtered.map((table) => {
              const isSelected = table === selectedTable;
              return (
                <li key={table}>
                  <button
                    onClick={() => onSelectTable(table)}
                    className={`w-full text-left px-3 py-2 text-sm truncate transition-colors cursor-pointer ${isSelected ? t.listItem.selected : t.listItem.base}`}
                    title={table}
                  >
                    {table}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
