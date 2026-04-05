import { useState, useEffect, useCallback, useMemo } from "react";
import type { TableInfo } from "shared/schemas";
import {
  loadSavedQueries,
  persistSavedQueries,
  findCompatibleIndex,
  createSavedQuery,
  type SavedQuery,
  type IndexMatch,
  type CreateSavedQueryInput,
} from "../lib/saved-queries";

export function useSavedQueries(tableInfo: TableInfo | null) {
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadSavedQueries().then((q) => {
      setSavedQueries(q);
      setLoaded(true);
    });
  }, []);

  const saveQuery = useCallback(
    async (input: CreateSavedQueryInput) => {
      const query = createSavedQuery(input);
      const next = [...savedQueries, query];
      setSavedQueries(next);
      await persistSavedQueries(next);
    },
    [savedQueries],
  );

  const deleteQuery = useCallback(
    async (id: string) => {
      const next = savedQueries.filter((q) => q.id !== id);
      setSavedQueries(next);
      await persistSavedQueries(next);
    },
    [savedQueries],
  );

  const compatibilityMap = useMemo(() => {
    const map = new Map<string, IndexMatch>();
    if (!tableInfo) return map;
    for (const q of savedQueries) {
      const match = findCompatibleIndex(q, tableInfo);
      if (match) map.set(q.id, match);
    }
    return map;
  }, [savedQueries, tableInfo]);

  const getCompatibleIndex = useCallback(
    (queryId: string): IndexMatch | null => {
      return compatibilityMap.get(queryId) ?? null;
    },
    [compatibilityMap],
  );

  return {
    savedQueries,
    loaded,
    saveQuery,
    deleteQuery,
    getCompatibleIndex,
  };
}
