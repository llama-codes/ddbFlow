import { useState, useEffect, useCallback } from "react";
import { cacheGet, cacheSet } from "../lib/cache";
import { CACHE_FAVORITE_TABLES } from "../lib/cache-keys";

export function useFavoriteTables() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    cacheGet<string[]>(CACHE_FAVORITE_TABLES).then((cached) => {
      if (cached && cached.length > 0) setFavorites(new Set(cached));
    });
  }, []);

  const toggleFavorite = useCallback((table: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(table)) next.delete(table);
      else next.add(table);
      cacheSet(CACHE_FAVORITE_TABLES, [...next]).catch(() => {});
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (table: string) => favorites.has(table),
    [favorites],
  );

  return { favorites, toggleFavorite, isFavorite };
}
