import { useState, useEffect, useMemo } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import { Button } from "../../components/Button";
import { Icon, IconPaths } from "../../components/Icon";
import { Title } from "../../components/Title";
import { SearchInput } from "../../components/SearchInput";
import { formatSavedQuerySummary, type SavedQuery, type IndexMatch } from "../../lib/saved-queries";

interface SavedQueriesPanelProps {
  savedQueries: SavedQuery[];
  onLoadQuery: (query: SavedQuery) => void;
  onDeleteQuery: (id: string) => void;
  getCompatibleIndex: (queryId: string) => IndexMatch | null;
  onClose: () => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getIndexLabel(match: IndexMatch): string {
  if (!match.indexValue) return "Table";
  return match.indexValue;
}

export function SavedQueriesPanel({
  savedQueries,
  onLoadQuery,
  onDeleteQuery,
  getCompatibleIndex,
  onClose,
}: SavedQueriesPanelProps) {
  const t = useTheme();
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const filteredQueries = useMemo(() => {
    if (!searchTerm.trim()) return savedQueries;
    const term = searchTerm.toLowerCase();
    return savedQueries.filter((q) => q.name.toLowerCase().includes(term));
  }, [savedQueries, searchTerm]);

  const sortedQueries = useMemo(() => {
    return [...filteredQueries].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [filteredQueries]);

  return (
    <>
      <div className={`fixed inset-0 ${t.bg.overlay} z-40`} onClick={onClose} />

      <div
        className={`fixed top-0 right-0 h-full w-96 ${t.bg.surface} border-l ${t.border.base} z-50 flex flex-col`}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${t.border.base}`}>
          <div>
            <Title bold>Saved Queries</Title>
            <div className={`text-[10px] ${t.text.faint} mt-0.5`}>
              {savedQueries.length} quer{savedQueries.length !== 1 ? "ies" : "y"}
            </div>
          </div>
          <Button.Container variant="ghost" onClick={onClose}>
            <Button.Icon>
              <Icon size={16}>{IconPaths.close}</Icon>
            </Button.Icon>
          </Button.Container>
        </div>

        {/* Search */}
        <div className={`px-4 py-3 border-b ${t.border.base}`}>
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Filter by name..."
            autoFocus
          />
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto">
          {sortedQueries.map((query) => {
            const indexMatch = getCompatibleIndex(query.id);
            const compatible = !!indexMatch;

            return (
              <div
                key={query.id}
                className={`px-4 py-3 border-b ${t.border.base} group ${
                  compatible
                    ? `cursor-pointer hover:${t.bg.hover}`
                    : "opacity-40 cursor-default"
                }`}
                onClick={() => compatible && onLoadQuery(query)}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    {/* Name */}
                    <div className={`text-sm font-medium truncate ${compatible ? t.text.secondary : t.text.faint}`}>
                      {query.name}
                    </div>

                    {/* Key expression */}
                    <div className={`text-xs font-mono ${t.text.faint} truncate mt-0.5`}>
                      {formatSavedQuerySummary(query)}
                    </div>

                    {/* Metadata row */}
                    <div className={`flex items-center gap-3 mt-1.5 text-[10px] ${t.text.faint}`}>
                      <span className="flex items-center gap-1">
                        <Icon size={10}>{IconPaths.clock}</Icon>
                        {formatDate(query.createdAt)}
                      </span>

                      {query.filters && query.filters.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Icon size={10}>{IconPaths.bolt}</Icon>
                          {query.filters.length} filter{query.filters.length !== 1 ? "s" : ""}
                        </span>
                      )}

                      <span
                        className={`px-1 py-px rounded font-mono ${t.bg.elevated} border ${t.border.muted}`}
                        style={{ fontSize: "9px" }}
                      >
                        {query.scanIndexForward ? "ASC" : "DESC"}
                      </span>
                    </div>

                    {/* Index info / compatibility */}
                    <div className="mt-1">
                      {compatible && indexMatch ? (
                        <span className={`text-[10px] ${t.text.faint}`}>
                          {getIndexLabel(indexMatch)}
                        </span>
                      ) : (
                        <span className={`flex items-center gap-1 text-[10px] ${t.text.faint}`}>
                          <Icon size={10}>{IconPaths.warning}</Icon>
                          Incompatible with current table
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    type="button"
                    className={`p-1 opacity-0 group-hover:opacity-100 ${t.text.faint} hover:${t.text.error} transition-opacity cursor-pointer shrink-0`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteQuery(query.id);
                    }}
                    title="Delete saved query"
                  >
                    <Icon size={12}>{IconPaths.trash}</Icon>
                  </button>
                </div>
              </div>
            );
          })}

          {/* Empty state */}
          {sortedQueries.length === 0 && (
            <div className={`flex items-center justify-center h-32 text-xs ${t.text.faint}`}>
              {searchTerm.trim()
                ? `No queries matching "${searchTerm}"`
                : "No saved queries yet"}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
