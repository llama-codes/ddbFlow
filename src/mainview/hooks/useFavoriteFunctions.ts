import { useState, useEffect, useCallback } from "react";
import { cacheGet, cacheSet } from "../lib/cache";
import { CACHE_FAVORITE_FUNCTIONS } from "../lib/cache-keys";

export function useFavoriteFunctions() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    cacheGet<string[]>(CACHE_FAVORITE_FUNCTIONS).then((cached) => {
      if (cached && cached.length > 0) setFavorites(new Set(cached));
    });
  }, []);

  const toggleFavorite = useCallback((functionName: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(functionName)) next.delete(functionName);
      else next.add(functionName);
      cacheSet(CACHE_FAVORITE_FUNCTIONS, [...next]).catch(() => {});
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (functionName: string) => favorites.has(functionName),
    [favorites],
  );

  return { favorites, toggleFavorite, isFavorite };
}
