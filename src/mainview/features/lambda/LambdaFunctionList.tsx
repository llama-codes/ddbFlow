import { useMemo, useState } from "react";
import { Button } from "../../components/Button";
import { CacheIndicator } from "../../components/CacheIndicator";
import { Icon, IconPaths } from "../../components/Icon";
import { SearchInput } from "../../components/SearchInput";
import { Title } from "../../components/Title";
import { Tooltip } from "../../components/Tooltip";
import { ListItem } from "../sidebar/ListItem";
import { useTheme } from "../../theme/ThemeProvider";
import { useFunctionCacheStatus } from "../../hooks/useFunctionCacheStatus";
import { useFavoriteFunctions } from "../../hooks/useFavoriteFunctions";
import { useLambdaFunctionsCtx } from "../../hooks/LambdaFunctionsContext";
import { useLambdaLogsCtx } from "../../hooks/LambdaLogsContext";

export function LambdaFunctionList() {
  const t = useTheme();
  const { functions, functionsLoading, functionsError, functionsCachedAt, loadFunctions } =
    useLambdaFunctionsCtx();
  const { selectedFunction, selectFunction } = useLambdaLogsCtx();
  const { functionsWithCache } = useFunctionCacheStatus(functions);
  const { favorites, isFavorite, toggleFavorite } = useFavoriteFunctions();

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
    const favs = [];
    const rest = [];
    for (const fn of functions) {
      if (favorites.has(fn.functionName)) favs.push(fn);
      else rest.push(fn);
    }
    return [...favs, ...rest];
  }, [favorites, functions]);

  const filtered = useMemo(() => {
    let list = sorted;
    if (favoritesOnly) list = list.filter((fn) => favorites.has(fn.functionName));
    const term = search.trim().toLowerCase();
    if (term) {
      list = list.filter((fn) =>
        [fn.functionName, fn.runtime, fn.description]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(term)),
      );
    }
    return list;
  }, [favorites, favoritesOnly, search, sorted]);

  return (
    <div className={`${t.bg.surfaceDim} border-r ${t.border.base} flex flex-col min-h-0`}>
      <div className={`flex items-center justify-between px-3 py-2 border-b ${t.border.base}`}>
        <Title>Functions</Title>
        <div className="flex items-center gap-0.5">
          <Tooltip text={favoritesOnly ? "Show all functions" : "Show favorites only"}>
            <Button.Container variant="ghost" onClick={() => setFavoritesOnly((p) => !p)}>
              <Button.Icon>
                <Icon size={14} className={favoritesOnly ? "text-yellow-400" : ""}>
                  {favoritesOnly ? IconPaths.star : IconPaths.starOutline}
                </Icon>
              </Button.Icon>
            </Button.Container>
          </Tooltip>
          <Tooltip text={searchOpen ? "Close search" : "Search functions"}>
            <Button.Container variant="ghost" onClick={toggleSearch}>
              <Button.Icon>
                <Icon size={14} className={searchOpen ? t.text.brand : ""}>{IconPaths.search}</Icon>
              </Button.Icon>
            </Button.Container>
          </Tooltip>
          <Tooltip text="Refresh functions">
            <Button.Container variant="ghost" onClick={loadFunctions}>
              <Button.Icon>
                <Icon size={14}>{IconPaths.refresh}</Icon>
              </Button.Icon>
            </Button.Container>
          </Tooltip>
          <CacheIndicator cachedAt={functionsCachedAt} />
        </div>
      </div>

      {searchOpen && (
        <div className={`px-2 py-1.5 border-b ${t.border.base}`}>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Filter functions..."
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {functionsLoading && (
          <p className={`px-3 py-4 text-sm ${t.text.faint} animate-pulse`}>
            Loading functions...
          </p>
        )}

        {functionsError && (
          <div className="px-3 py-3">
            <div className="flex items-start gap-2">
              <Icon size={16} className={`${t.text.error} shrink-0 mt-0.5`}>{IconPaths.warning}</Icon>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium ${t.text.primary}`}>Failed to load</p>
                <p className={`text-xs ${t.text.muted} mt-1 break-words`}>{functionsError}</p>
                <button
                  type="button"
                  className={`mt-2 text-xs ${t.text.brand} hover:underline cursor-pointer`}
                  onClick={loadFunctions}
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {!functionsLoading && !functionsError && filtered.length === 0 && (
          <p className={`px-3 py-4 text-sm ${t.text.faint}`}>
            {search.trim() ? "No matches" : favoritesOnly ? "No favorites yet" : "No functions found"}
          </p>
        )}

        {!functionsLoading && filtered.length > 0 && (
          <ul>
            {filtered.map((fn) => (
              <li key={fn.functionArn || fn.functionName}>
                <ListItem
                  label={fn.functionName}
                  selected={fn.functionName === selectedFunction}
                  onClick={() => selectFunction(fn)}
                  isFavorite={isFavorite(fn.functionName)}
                  onToggleFavorite={() => toggleFavorite(fn.functionName)}
                  trailingIcon={
                    functionsWithCache.has(fn.functionName) ? (
                      <Tooltip text="Has cached logs" position="right">
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
