/**
 * Manages app-level settings: AWS region, scan limit, and connection status.
 *
 * Persists region and scan limit to the filesystem cache so they survive restarts.
 * Region change and cache purge are cross-cutting and stay in App.tsx.
 */
import { useState, useCallback } from "react";
import { rpc } from "../lib/electrobun";
import { cacheGet, cacheSet } from "../lib/cache";
import { CACHE_REGION, CACHE_SCAN_LIMIT, DEFAULT_SCAN_LIMIT } from "../lib/cache-keys";

export function useSettings() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [region, setRegion] = useState("us-east-1");
  const [scanLimit, setScanLimit] = useState(DEFAULT_SCAN_LIMIT);
  const [connectionStatus, setConnectionStatus] = useState<"unknown" | "connected" | "error">("unknown");
  const [checkingConnection, setCheckingConnection] = useState(false);

  const toggleSettings = useCallback(() => {
    setSettingsOpen((o) => !o);
  }, []);

  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
  }, []);

  const handleScanLimitChange = useCallback((newLimit: number) => {
    setScanLimit(newLimit);
    cacheSet(CACHE_SCAN_LIMIT, newLimit).catch(() => {});
  }, []);

  const checkConnection = useCallback(async () => {
    setCheckingConnection(true);
    try {
      await rpc.request.ping({});
      setConnectionStatus("connected");
    } catch {
      setConnectionStatus("error");
    } finally {
      setCheckingConnection(false);
    }
  }, []);

  const restoreSettingsFromCache = useCallback(async () => {
    const cachedRegion = await cacheGet<string>(CACHE_REGION);
    if (cachedRegion) {
      setRegion(cachedRegion);
      await rpc.request.setRegion({ region: cachedRegion });
    }

    const cachedLimit = await cacheGet<number>(CACHE_SCAN_LIMIT);
    if (cachedLimit) setScanLimit(cachedLimit);
  }, []);

  return {
    settingsOpen,
    toggleSettings,
    closeSettings,
    region,
    setRegion,
    scanLimit,
    handleScanLimitChange,
    connectionStatus,
    setConnectionStatus,
    checkingConnection,
    checkConnection,
    restoreSettingsFromCache,
  };
}
