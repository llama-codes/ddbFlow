import { useState, useMemo } from "react";
import { Icon, IconPaths } from "../../components/Icon";
import { Tooltip } from "../../components/Tooltip";
import { Button } from "../../components/Button";
import { CacheIndicator } from "../../components/CacheIndicator";
import { Title } from "../../components/Title";
import { SearchInput } from "../../components/SearchInput";
import { ListItem } from "./ListItem";
import { useTheme } from "../../theme/ThemeProvider";
import { useTablesCtx } from "../../hooks/TablesContext";
import { useTableDataCtx } from "../../hooks/TableDataContext";
import { useTableCacheStatus } from "../../hooks/useTableCacheStatus";
import { useFavoriteTables } from "../../hooks/useFavoriteTables";

export function TableList() {
  const t = useTheme();
  const { tables, tablesLoading, tablesError, tablesCachedAt, loadTables } = useTablesCtx();
  const { selectedTable, selectTable } = useTableDataCtx();
  const { tablesWithCache } = useTableCacheStatus(tables);
  const { isFavorite, toggleFavorite, favorites } = useFavoriteTables();

  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  function toggleSearch() {
    setSearchOpen((prev) => {
      if (prev) setSearch("");
      return !prev;
    });
  }

  const sorted = useMemo(() => {
    const favs: string[] = [];
    const rest: string[] = [];
    for (const table of tables) {
      if (favorites.has(table)) favs.push(table);
      else rest.push(table);
    }
    return [...favs, ...rest];
  }, [tables, favorites]);

  const filtered = useMemo(() => {
    let list = sorted;
    if (favoritesOnly) list = list.filter((t) => favorites.has(t));
    if (search.trim()) list = list.filter((t) => t.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [sorted, favoritesOnly, favorites, search]);

  return (
    <div className={`${t.bg.surfaceDim} border-r ${t.border.base} flex flex-col min-h-0`}>
      <div className={`flex items-center justify-between px-3 py-2 border-b ${t.border.base}`}>
        <Title>Tables</Title>
        <div className="flex items-center gap-0.5">
          <Tooltip text={favoritesOnly ? "Show all tables" : "Show favorites only"}>
            <Button.Container variant="ghost" onClick={() => setFavoritesOnly((p) => !p)}>
              <Button.Icon>
                <Icon size={14} className={favoritesOnly ? "text-yellow-400" : ""}>
                  {favoritesOnly ? IconPaths.star : IconPaths.starOutline}
                </Icon>
              </Button.Icon>
            </Button.Container>
          </Tooltip>
          <Tooltip text={searchOpen ? "Close search" : "Search tables"}>
            <Button.Container variant="ghost" onClick={toggleSearch}>
              <Button.Icon>
                <Icon size={14} className={searchOpen ? t.text.brand : ""}>{IconPaths.search}</Icon>
              </Button.Icon>
            </Button.Container>
          </Tooltip>
          <Tooltip text="Refresh tables">
            <Button.Container variant="ghost" onClick={loadTables}>
              <Button.Icon>
                <Icon size={14}>{IconPaths.refresh}</Icon>
              </Button.Icon>
            </Button.Container>
          </Tooltip>
          <CacheIndicator cachedAt={tablesCachedAt} />
        </div>
      </div>

      {searchOpen && (
        <div className={`px-2 py-1.5 border-b ${t.border.base}`}>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Filter tables…"
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {tablesLoading && (
          <p className={`px-3 py-4 text-sm ${t.text.faint} animate-pulse`}>
            Loading tables...
          </p>
        )}

        {tablesError && (
          <div className={`px-3 py-3`}>
            <div className="flex items-start gap-2">
              <Icon size={16} className={`${t.text.error} shrink-0 mt-0.5`}>{IconPaths.warning}</Icon>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium ${t.text.primary}`}>Failed to load</p>
                <p className={`text-xs ${t.text.muted} mt-1 break-words`}>{tablesError}</p>
                <button
                  type="button"
                  className={`mt-2 text-xs ${t.text.brand} hover:underline cursor-pointer`}
                  onClick={loadTables}
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {!tablesLoading && !tablesError && filtered.length === 0 && (
          <p className={`px-3 py-4 text-sm ${t.text.faint}`}>
            {search.trim() ? "No matches" : favoritesOnly ? "No favorites yet" : "No tables found"}
          </p>
        )}

        {!tablesLoading && filtered.length > 0 && (
          <ul>
            {filtered.map((table) => (
              <li key={table}>
                <ListItem
                  label={table}
                  selected={table === selectedTable}
                  onClick={() => selectTable(table)}
                  isFavorite={isFavorite(table)}
                  onToggleFavorite={() => toggleFavorite(table)}
                  trailingIcon={
                    tablesWithCache.has(table) ? (
                      <Tooltip text="Has cached data" position="right">
                        <span className={`${t.text.faint} flex items-center`}>
                          <Icon size={10}>{IconPaths.bolt}</Icon>
                        </span>
                      </Tooltip>
                    ) : undefined
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
