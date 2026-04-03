import { rpc } from "./electrobun";

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await rpc.request.readCache({ key });
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch { return null; }
}

export async function cacheSet<T>(key: string, value: T): Promise<void> {
  await rpc.request.writeCache({ key, value: JSON.stringify(value) });
}

export async function cacheDel(key: string): Promise<void> {
  await rpc.request.deleteCache({ key });
}

export async function cachePurge(): Promise<void> {
  await rpc.request.purgeCache({});
}
